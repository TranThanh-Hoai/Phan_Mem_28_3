
const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const crypto = require('crypto');
const userModel = require('./schemas/users');
const roleModel = require('./schemas/roles');
const nodemailer = require('nodemailer');

// Reuse existing mail transporter configuration or create a new one
// Based on utils/mailHandler.js structure
const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 25,
    secure: false, // Use true for port 465, false for port 587
    auth: {
        user: "16a28ae8bae82f", // REPLACE WITH YOUR MAILTRAP/SMTP USER
        pass: "4b0931ebe333ed", // REPLACE WITH YOUR MAILTRAP/SMTP PASSWORD
    },
});

async function sendEmail(email, username, password) {
    try {
        await transporter.sendMail({
            from: '"Admin System" <admin@yourdomain.com>',
            to: email,
            subject: "Your New Account Credentials",
            text: `Hello ${username},\n\nYour account has been created.\n\nUsername: ${username}\nPassword: ${password}\n\nPlease login and change your password.`,
            html: `<h3>Hello ${username},</h3>
                   <p>Your account has been created successfully.</p>
                   <div style="background: #f4f4f4; padding: 15px; border-radius: 5px;">
                    <p><strong>Username:</strong> ${username}</p>
                    <p><strong>Password:</strong> ${password}</p>
                   </div>
                   <p>Please login and change your password upon your first access.</p>`
        });
        console.log(`Email sent to ${email}`);
    } catch (error) {
        console.warn(`Failed to send email to ${email}:`, error.message);
    }
}

function generateRandomPassword(length = 16) {
    // Generate 16 random characters using alphanumeric + symbols
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
    let pass = '';
    for (let i = 0; i < length; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
}

async function importUsers() {
    try {
        // Connect to DB (using the URI from app.js)
        await mongoose.connect('mongodb://localhost:27017/NNPTUD-C4');
        console.log("Connected to database");

        // Find the 'USER' role
        let userRole = await roleModel.findOne({ name: 'USER' });
        if (!userRole) {
            userRole = await roleModel.findOne({ name: 'user' });
        }

        if (!userRole) {
            console.error("Role 'USER' not found. Please ensure it exists in the roles collection.");
            process.exit(1);
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile('user.xlsx');
        const worksheet = workbook.getWorksheet(1);

        const usersToCreate = [];
        let headerMap = { username: -1, email: -1 };

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) {
                // Determine column indices based on header names
                row.eachCell((cell, colNumber) => {
                    const header = cell.value ? cell.value.toString().toLowerCase() : "";
                    if (header.includes("user")) headerMap.username = colNumber;
                    if (header.includes("email") || header.includes("mail")) headerMap.email = colNumber;
                });

                // Fallback if headers not found by name
                if (headerMap.username === -1) headerMap.username = 1;
                if (headerMap.email === -1) headerMap.email = 2;

                return;
            }

            const getVal = (v) => (v && typeof v === 'object') ? (v.text || v.result || JSON.stringify(v)) : v;

            const username = getVal(row.getCell(headerMap.username).value);
            let email = getVal(row.getCell(headerMap.email).value);

            // Handle potential Link/Object format
            if (email && typeof email === 'object') email = email.text || email.hyperlink;

            if (username && email) {
                usersToCreate.push({
                    username: username.toString().trim(),
                    email: email.toString().trim().toLowerCase()
                });
            }
        });

        console.log(`Found ${usersToCreate.length} potential users in Excel file.`);

        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        for (const userData of usersToCreate) {
            const tempPassword = generateRandomPassword();

            try {
                // Check if user already exists
                const existing = await userModel.findOne({ $or: [{ username: userData.username }, { email: userData.email }] });
                if (existing) {
                    console.log(`- Skipping ${userData.username}: User or email already exists.`);
                    continue;
                }

                const newUser = new userModel({
                    username: userData.username,
                    email: userData.email,
                    password: tempPassword, // Schema 'pre-save' hook handles hashing
                    role: userRole._id,
                    status: true,
                    fullName: userData.username
                });

                await newUser.save();
                console.log(`+ Created user: ${userData.username}`);

                // Send email
                await sendEmail(userData.email, userData.username, tempPassword);

                // Add delay to avoid Mailtrap "Too many emails per sec" limit
                await sleep(1000); 

            } catch (error) {
                console.error(`! Error creating ${userData.username}:`, error.message);
            }
        }

        // Give some time for emails to be sent before closing connection
        setTimeout(() => {
            console.log("Import process finished.");
            mongoose.disconnect();
        }, 3000);

    } catch (error) {
        console.error("Import operation failed:", error);
    }
}

importUsers();

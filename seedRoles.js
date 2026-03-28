
const mongoose = require('mongoose');
const roleModel = require('./schemas/roles');

async function seedRoles() {
    try {
        await mongoose.connect('mongodb://localhost:27017/NNPTUD-C4');
        const roles = [
            { name: "ADMIN", description: "System Administrator" },
            { name: "USER", description: "Regular User" }
        ];

        for (const roleData of roles) {
            const exists = await roleModel.findOne({ name: roleData.name });
            if (!exists) {
                const newRole = new roleModel(roleData);
                await newRole.save();
                console.log(`Created role: ${roleData.name}`);
            } else {
                console.log(`Role ${roleData.name} already exists.`);
            }
        }
        mongoose.disconnect();
    } catch (err) {
        console.error("Error seeding roles:", err);
    }
}
seedRoles();

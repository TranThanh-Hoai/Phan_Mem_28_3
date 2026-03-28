
const mongoose = require('mongoose');
const roleModel = require('./schemas/roles');

async function checkRoles() {
    await mongoose.connect('mongodb://localhost:27017/NNPTUD-C4');
    const roles = await roleModel.find({});
    console.log("Current Roles in Database:", JSON.stringify(roles, null, 2));
    mongoose.disconnect();
}
checkRoles();

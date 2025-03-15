// models/userModel.js

// A simple in-memory user "database"
// In production, you'll replace this with a real DB.
let users = [];

// Possible roles
const ROLES = {
  OPERATOR: 'operator',
  LEADER: 'leader',
  SUPERVISOR: 'supervisor',
  ENGINEER: 'engineer',
  ADMIN: 'admin',
};

module.exports = { users, ROLES };

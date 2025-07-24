import { createSuperUser } from '../services/userService.js';

const createAdmin = async () => {
  try {
    const email = 'admin@cityconnect.com';
    const password = 'Admin@123'; // In production, use a more secure password

    const user = await createSuperUser(email, password);
    console.log('Super user created successfully:', user.email);
  } catch (error) {
    console.error('Failed to create super user:', error);
  }
};

createAdmin(); 
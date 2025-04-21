import axios from 'axios'; // Make sure you import axios

// Base URL for your API
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Register a parent
export const registerUser = async (parentData: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  address: string;
  relationship: string;
  isCoach: boolean;
  aauNumber: string;
  agreeToTerms: boolean;
}) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/register`, parentData);
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || 'Registration failed. Please try again.'
      );
    } else {
      throw new Error('An unexpected error occurred during registration.');
    }
  }
};

// Login a parent
export const loginUser = async (email: string, password: string) => {
  try {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    console.log('Login attempt with:', { trimmedEmail, trimmedPassword }); // Debugging

    const res = await axios.post(`${API_BASE_URL}/login`, {
      email: trimmedEmail,
      password: trimmedPassword,
    });

    return res.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || 'Login failed. Please try again.'
      );
    } else {
      throw new Error('An unexpected error occurred during login.');
    }
  }
};

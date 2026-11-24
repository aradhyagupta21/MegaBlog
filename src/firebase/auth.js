import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import conf from "../conf/conf.js";

export class AuthService {
  app;
  auth;

  constructor() {
    this.app = initializeApp({
      apiKey: conf.firebaseApiKey,
      authDomain: conf.firebaseAuthDomain,
      projectId: conf.firebaseProjectId,
      storageBucket: conf.firebaseStorageBucket,
      messagingSenderId: conf.firebaseMessagingSenderId,
      appId: conf.firebaseAppId,
    });
    this.auth = getAuth(this.app);
  }

  async createAccount({ email, password, name }) {
    try {
      const userAccount = await createUserWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      if (userAccount) {
        if (name) {
          await updateProfile(userAccount.user, { displayName: name });
        }
        // Automatically logs the user in after signing up, matching the lecture flow
        return this.login({ email, password });
      } else {
        return userAccount;
      }
    } catch (error) {
      throw error;
    }
  }

  async login({ email, password }) {
    try {
      return await signInWithEmailAndPassword(this.auth, email, password);
    } catch (error) {
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      return await new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(
          this.auth,
          (user) => {
            unsubscribe();
            if (user) {
              // Maps uid to $id so Appwrite-style checks (userData.$id) in future videos work without edits
              resolve({
                $id: user.uid,
                email: user.email,
                name: user.displayName || user.email.split("@")[0],
              });
            } else {
              resolve(null);
            }
          },
          (error) => {
            console.log("Firebase service :: getCurrentUser :: error", error);
            resolve(null);
          }
        );
      });
    } catch (error) {
      console.log("Firebase service :: getCurrentUser :: error", error);
    }

    return null;
  }

  async logout() {
    try {
      await signOut(this.auth);
    } catch (error) {
      console.log("Firebase service :: logout :: error", error);
    }
  }
}

const authService = new AuthService();

export default authService;
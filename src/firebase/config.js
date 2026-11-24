import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import conf from "../conf/conf.js";

export class Service {
  app;
  databases;
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
    this.databases = getFirestore(this.app);
    this.auth = getAuth(this.app);
  }

  // ==================== DATABASE SERVICES (FIRESTORE) ====================

  async createPost({ title, slug, content, featuredImage, status, userId }) {
    try {
      // Using `slug` as the Firestore document ID (matches Appwrite's documentId = slug)
      const postRef = doc(this.databases, "posts", slug);
      const postData = {
        title,
        content,
        featuredImage,
        status,
        userId,
        createdAt: new Date().toISOString(),
      };
      await setDoc(postRef, postData);
      return { $id: slug, ...postData };
    } catch (error) {
      console.log("Firebase service :: createPost :: error", error);
    }
  }

  async updatePost(slug, { title, content, featuredImage, status }) {
    try {
      const postRef = doc(this.databases, "posts", slug);
      const updatedData = {
        title,
        content,
        featuredImage,
        status,
      };
      await updateDoc(postRef, updatedData);
      return { $id: slug, ...updatedData };
    } catch (error) {
      console.log("Firebase service :: updatePost :: error", error);
    }
  }

  async deletePost(slug) {
    try {
      const postRef = doc(this.databases, "posts", slug);
      await deleteDoc(postRef);
      return true;
    } catch (error) {
      console.log("Firebase service :: deletePost :: error", error);
      return false;
    }
  }

  async getPost(slug) {
    try {
      const postRef = doc(this.databases, "posts", slug);
      const postSnap = await getDoc(postRef);

      if (postSnap.exists()) {
        return {
          $id: postSnap.id,
          ...postSnap.data(),
        };
      } else {
        return false;
      }
    } catch (error) {
      console.log("Firebase service :: getPost :: error", error);
      return false;
    }
  }

  async getPosts(queries = [where("status", "==", "active")]) {
    try {
      const postsRef = collection(this.databases, "posts");
      const q = queries.length > 0 ? query(postsRef, ...queries) : postsRef;
      const querySnapshot = await getDocs(q);

      const documents = querySnapshot.docs.map((docItem) => ({
        $id: docItem.id,
        ...docItem.data(),
      }));

      // Wrapped in `{ documents }` so `posts.documents` in upcoming UI components works identically to Appwrite
      return { documents };
    } catch (error) {
      console.log("Firebase service :: getPosts :: error", error);
      return false;
    }
  }

  // ==================== FILE UPLOAD SERVICES (CLOUDINARY) ====================

  async uploadFile(file) {
    try {
      // Guard check: replicates Appwrite's authenticated-users-only bucket rule
      if (!this.auth.currentUser) {
        throw new Error("User must be logged in to upload files");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", conf.cloudinaryUploadPreset);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${conf.cloudinaryCloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Cloudinary upload failed");
      }

      const data = await response.json();

      // Returning `$id: data.secure_url` so `file.$id` in PostForm.jsx saves the direct CDN URL
      return {
        $id: data.secure_url,
        url: data.secure_url,
        publicId: data.public_id,
      };
    } catch (error) {
      console.log("Cloudinary service :: uploadFile :: error", error);
      return false;
    }
  }

  async deleteFile(fileId) {
    try {
      // Client-side JS cannot delete from Cloudinary without exposing your API Secret.
      // Returning `true` lets `PostForm.jsx` proceed cleanly when replacing/deleting post images.
      console.log("Cloudinary service :: deleteFile :: skipped client-side delete for", fileId);
      return true;
    } catch (error) {
      console.log("Cloudinary service :: deleteFile :: error", error);
      return false;
    }
  }

  getFilePreview(fileId) {
    // Since `featuredImage` stores the full `secure_url`, return it directly for `<img src={...} />`
    return fileId;
  }
}

const service = new Service();
export default service;
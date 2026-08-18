import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAvArbY33MtxRHK_Z2l4c-QFqeTCmg_sRk",
  authDomain: "ubuntu-connect-5a26f.firebaseapp.com",
  projectId: "ubuntu-connect-5a26f",
  storageBucket: "ubuntu-connect-5a26f.firebasestorage.app",
  messagingSenderId: "849692634225",
  appId: "1:849692634225:web:6cf0ed91307cc6f72f3fd0",
  measurementId: "G-9GVWQDKXLG",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

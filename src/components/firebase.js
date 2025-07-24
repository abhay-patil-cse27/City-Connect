import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyDjiJP1lAfswSpFpdPeabedhmtDFfAukZU",
    authDomain: "project-management-tool-ea31f.firebaseapp.com",
    projectId: "project-management-tool-ea31f",
    storageBucket: "project-management-tool-ea31f.appspot.com",
    messagingSenderId: "934966707074",
    appId: "1:934966707074:web:0487920d07f5810092c59b",
    measurementId: "G-DCJ00QSRPR"
  };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
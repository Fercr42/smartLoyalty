"use client";
import { useState } from "react";
import { db, storage, auth } from "../firebase/config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, setDoc } from "firebase/firestore";

export default function BusinessForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    let logoUrl = "";
    if (logo) {
      const logoRef = ref(storage, `logos/${auth.currentUser.uid}`);
      await uploadBytes(logoRef, logo);
      logoUrl = await getDownloadURL(logoRef);
    }

    await setDoc(doc(db, "companies", auth.currentUser.uid), {
      name,
      description,
      logoUrl,
      owner: auth.currentUser.email,
    });
    alert("Empresa registrada ✅");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 p-6 max-w-md mx-auto"
    >
      <input
        placeholder="Nombre de la empresa"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border p-2 rounded"
      />
      <textarea
        placeholder="Descripción"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="border p-2 rounded"
      />
      <input
        type="file"
        onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
      />
      <button className="bg-green-600 text-white p-2 rounded">Guardar</button>
    </form>
  );
}

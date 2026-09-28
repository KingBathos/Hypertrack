"use server";

import { getDb } from "@/lib/db/mongodb";
import { generatePublicId } from "@/lib/utils/id";
import { redirect } from "next/navigation";
import type { ProfileDocument } from "@/types/profile";

export async function saveOnboardingProfile(data: any, userId: string) {
  const db = await getDb();
  const usersCollection = db.collection("users");
  const profilesCollection = db.collection("profiles");

  const userDoc = await usersCollection.findOne({ publicId: userId }, { projection: { _id: 1 } });
  
  if (!userDoc) {
    throw new Error("Usuario no encontrado.");
  }

  const existingProfile = await profilesCollection.findOne({ userId: userDoc._id }, { projection: { _id: 1 } });
  if (existingProfile) {
    throw new Error("Ya existe un perfil para este usuario.");
  }

  const publicId = generatePublicId("prf");
  const displayName = `${data.firstName.trim()} ${data.lastName.trim()}`;
  const now = new Date();

  const profileDocument: Omit<ProfileDocument, "_id"> = {
    userId: userDoc._id,
    publicId,
    identity: {
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      displayName,
    },
    contact: {
      phone: data.phone,
      country: "PE",
    },
    demographics: {
      birthDate: new Date(data.birthDate),
      sex: data.sex,
    },
    physical: {
      heightCm: Number(data.heightCm),
      weightKg: Number(data.weightKg || 0), // Not in the schema currently but requested by user
    },
    goals: {
      primaryGoal: data.primaryGoal,
    },
    preferences: {
      measurementSystem: data.measurementSystem,
    },
    medical: {
      injuries: [],
      allergies: [],
    },
    metadata: {
      schemaVersion: 1,
    },
    audit: {
      createdAt: now,
      updatedAt: now,
    },
    onboardingCompleted: true, // Requested by user
  } as any; // Cast as any because of dynamic modifications like onboardingCompleted and weightKg

  try {
    await profilesCollection.insertOne(profileDocument as any);
  } catch (error: any) {
    if (error.code === 11000 && error.message.includes("contact.phone")) {
      throw new Error("Este número de teléfono ya está registrado en otra cuenta.");
    }
    throw error;
  }

  redirect("/dashboard");
}

export async function checkPhoneExists(phone: string): Promise<boolean> {
  const db = await getDb();
  const profilesCollection = db.collection("profiles");
  const existing = await profilesCollection.findOne({ "contact.phone": phone }, { projection: { _id: 1 } });
  return !!existing;
}

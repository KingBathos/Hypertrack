"use server";

import { generatePublicId } from "@/lib/utils/id";
import { redirect } from "next/navigation";
import type { ProfileDocument } from "@/types/profile";
import { UserDAO } from "@/lib/dao/user.dao";
import { ProfileDAO } from "@/lib/dao/profile.dao";

export async function saveOnboardingProfile(data: any, userId: string) {
  const userDoc = await UserDAO.findByPublicId(userId);

  if (!userDoc) {
    throw new Error("Usuario no encontrado.");
  }

  const existingProfile = await ProfileDAO.findProfileByUserId(userDoc._id);
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
      weightKg: Number(data.weightKg || 0),
    },
    goals: {
      primaryGoal: data.primaryGoal,
    },
    lifestyle: {
      activityLevel: data.activityLevel,
      trainingExperience: data.trainingExperience,
      trainingFrequencyDays: Number(data.trainingFrequencyDays),
      sleepHoursAvg: Number(data.sleepHoursAvg),
    },
    preferences: {
      measurementSystem: data.measurementSystem,
    },
    medical: {
      injuries: [],
      allergies: [],
    },
    metadata: {
      schemaVersion: 2,
    },
    audit: {
      createdAt: now,
      updatedAt: now,
    },
    onboardingCompleted: true,
  } as any;

  try {
    await ProfileDAO.insertProfile(profileDocument);
  } catch (error: any) {
    if (error.code === 11000 && error.message.includes("contact.phone")) {
      throw new Error("Este número de teléfono ya está registrado en otra cuenta.");
    }
    throw error;
  }

  redirect("/dashboard");
}

export async function checkPhoneExists(phone: string): Promise<boolean> {
  const existing = await ProfileDAO.findProfileByPhone(phone);
  return !!existing;
}

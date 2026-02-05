
import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  voterId: z.string().min(6, { message: "Voter ID must be at least 6 characters." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string(),
  faceImage: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export type RegisterSchema = z.infer<typeof registerSchema>;


export const loginSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email address." }),
    password: z.string().min(1, { message: "Password is required." }),
});

export type LoginSchema = z.infer<typeof loginSchema>;

export const FaceMatchInputSchema = z.object({
  registeredImage: z.string().describe("The original face image the user registered with, as a data URI."),
  capturedFaceImage: z.string().describe("The new face image captured during login, as a data URI."),
});
export type FaceMatchInput = z.infer<typeof FaceMatchInputSchema>;

export const FaceMatchOutputSchema = z.object({
  isMatch: z.boolean().describe('Whether the new face image matches the registered one.'),
});
export type FaceMatchOutput = z.infer<typeof FaceMatchOutputSchema>;

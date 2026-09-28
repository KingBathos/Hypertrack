import { z } from "zod";

export const commentSchema = z.object({
  text: z
    .string({ error: "El comentario es requerido" })
    .min(1, "El comentario no puede estar vacío")
    .max(1000, "Máximo 1000 caracteres")
    .trim(),
});

export type CommentInput = z.infer<typeof commentSchema>;

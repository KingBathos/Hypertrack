"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { commentSchema, type CommentInput } from "@/lib/schemas/comment.schema";

interface Comment {
  _id: string;
  authorPublicId: string;
  role: string;
  text: string;
  createdAt: string;
}

export function SessionComments({ sessionId }: { sessionId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CommentInput>({
    resolver: zodResolver(commentSchema)
  });

  useEffect(() => {
    async function fetchComments() {
      try {
        const res = await fetch(`/api/workouts/${sessionId}/comments`);
        if (res.ok) {
          const data = await res.json();
          setComments(data.comments);
        }
      } catch (err) {
        console.error("Error fetching comments", err);
      } finally {
        setLoading(false);
      }
    }
    fetchComments();
  }, [sessionId]);

  const onSubmit = async (data: CommentInput) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/workouts/${sessionId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const result = await res.json();
        setComments(prev => [...prev, result.comment]);
        reset();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-8 border-t-4 border-zinc-800 pt-6">
      <h4 className="text-sm text-red-600 font-mono font-bold uppercase tracking-widest mb-4">NOTAS DEL ENTRENAMIENTO</h4>
      
      {loading ? (
        <div className="text-zinc-500 font-mono text-xs uppercase">Cargando notas...</div>
      ) : (
        <div className="space-y-4 mb-6">
          {comments.length === 0 ? (
            <p className="text-zinc-600 text-sm font-mono">No hay notas registradas para esta sesión.</p>
          ) : (
            comments.map(comment => (
              <div key={comment._id} className="bg-zinc-900 border-l-4 border-red-600 p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white font-bold text-xs uppercase tracking-wider">
                    {comment.role === 'COACH' ? '👨‍🏫 Tu Entrenador' : '💪 Tú'}
                  </span>
                  <span className="text-zinc-500 text-[10px] font-mono">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-zinc-300 text-sm">{comment.text}</p>
              </div>
            ))
          )}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2">
        <textarea
          {...register("text")}
          placeholder="Escribe un feedback, nota o sensación sobre este entrenamiento..."
          className="w-full bg-black border-2 border-zinc-800 text-white p-3 font-mono text-sm focus:border-red-600 focus:outline-none resize-none min-h-[80px] placeholder:text-zinc-700"
        />
        {errors.text && <span className="text-red-500 text-[10px] font-bold uppercase">{errors.text.message}</span>}
        
        <button 
          type="submit" 
          disabled={submitting}
          className="self-end bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest px-6 py-2 text-xs transition-colors disabled:opacity-50 cursor-pointer"
        >
          {submitting ? "ENVIANDO..." : "PUBLICAR NOTA"}
        </button>
      </form>
    </div>
  );
}

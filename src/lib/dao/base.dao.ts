/**
 * src/lib/dao/base.dao.ts
 *
 * Clase base y utilidades para la capa de Acceso a Datos (Data Access Object - DAO).
 * Centraliza la conexión a MongoDB, validación y conversión segura de ObjectIds,
 * y manejo de proyecciones tipadas.
 */

import { ObjectId, type Collection, type Db, type Document } from "mongodb";
import { getDb } from "../db/mongodb";

export abstract class BaseDAO<T extends Document> {
  protected readonly collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  /**
   * Obtiene la instancia de la base de datos de forma asíncrona.
   */
  protected async getDatabase(): Promise<Db> {
    return getDb();
  }

  /**
   * Obtiene la colección MongoDB fuertemente tipada.
   */
  public async getCollection(): Promise<Collection<T>> {
    const db = await this.getDatabase();
    return db.collection<T>(this.collectionName);
  }

  /**
   * Conversión segura de string o ObjectId a ObjectId válido de MongoDB.
   * Retorna null si la cadena no cumple el formato BSON ObjectId de 24 caracteres hex.
   */
  public toObjectId(id: string | ObjectId): ObjectId | null {
    if (id instanceof ObjectId) return id;
    if (typeof id === "string" && ObjectId.isValid(id) && id.length === 24) {
      return new ObjectId(id);
    }
    return null;
  }

  /**
   * Fuerza la conversión a ObjectId o arroja un error de validación de dominio.
   */
  public requireObjectId(id: string | ObjectId, fieldName: string = "id"): ObjectId {
    const objectId = this.toObjectId(id);
    if (!objectId) {
      throw new Error(`Identificador BSON inválido para el campo "${fieldName}": ${String(id)}`);
    }
    return objectId;
  }
}

"use server";

import { CreateUserParams } from "@/types";
import { ID, Query } from "node-appwrite";
import { revalidatePath } from "next/cache";
import {
  account,
  databases,
  DATABASE_ID,
  USER_COLLECTION_ID,
} from "../appwrite.config";
import { redirect } from "next/navigation";

let globalSession: any = null;

export const createUser = async (user: CreateUserParams) => {
  try {
    const newUser = await account.create(
      ID.unique(),
      user.email,
      user.password,
      user.name
    );

    const documentData = {
      name: user.name,
      email: user.email,
      status: true,
      last_login_time: new Date().toISOString(),
    };

    const newDocument = await databases.createDocument(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      ID.unique(),
      documentData
    );

    return { newUser, newDocument };
  } catch (error: any) {
    console.error(error.message);
    if (error.code === 409) {
      return { error: "User already exists" };
    }
  }
};

export const getUser = async (email: string, password: string) => {
  try {
    const session = await account.createEmailPasswordSession(email, password);

    globalSession = session;

    const users = await databases.listDocuments(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      [Query.equal("email", [session.providerUid])]
    );

    if (users.documents[0].status === false) {
      return { error: "User is blocked" };
    } else {
      await databases.updateDocument(
        DATABASE_ID!,
        USER_COLLECTION_ID!,
        users.documents[0].$id,
        {
          last_login_time: new Date().toISOString(),
        }
      );

      return session;
    }
  } catch (error: any) {
    return { error: error.code };
  }
};

export const getUsersInfo = async () => {
  try {
    const users = await databases.listDocuments(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      [
        Query.select(["$id", "name", "email", "status", "last_login_time"]),
        Query.orderDesc("last_login_time"),
      ]
    );

    return users.documents.map((doc: any) => ({
      id: doc.$id,
      name: doc.name,
      email: doc.email,
      status: doc.status,
      last_login_time: doc.last_login_time,
    }));
  } catch (error: any) {
    console.error(error);
    return [];
  }
};

export const blockUser = async (ids: string[]) => {
  try {
    const users = await databases.listDocuments(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      [Query.equal("email", [globalSession.providerUid])]
    );

    if (users.documents[0].status === false) {
      return { redirect: "/" };
    } else {
      await Promise.all(
        ids.map(async (id) => {
          await databases.updateDocument(
            DATABASE_ID!,
            USER_COLLECTION_ID!,
            id,
            {
              status: false,
            }
          );
        })
      );
      return { redirect: "/dashboard" };
    }
  } catch (error) {
    return { error: "An error occurred" };
  }
};

export const unblockUser = async (ids: string[]) => {
  try {
    const users = await databases.listDocuments(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      [Query.equal("email", [globalSession.providerUid])]
    );

    if (users.documents[0].status === false) {
      return { redirect: "/" };
    } else {
      await Promise.all(
        ids.map(async (id) => {
          await databases.updateDocument(
            DATABASE_ID!,
            USER_COLLECTION_ID!,
            id,
            {
              status: true,
            }
          );
        })
      );
      return { redirect: "/dashboard" };
    }
  } catch (error) {
    return { error: "An error occurred" };
  }
};

export const deleteUser = async (id: string[]) => {
  try {
    const users = await databases.listDocuments(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      [Query.equal("email", [globalSession.providerUid])]
    );

    if (users.documents[0].status === false) {
      return { redirect: "/" };
    } else {
      await Promise.all(
        id.map(async (id) => {
          await databases.deleteDocument(DATABASE_ID!, USER_COLLECTION_ID!, id);
        })
      );
      return { redirect: "/dashboard" };
    }
  } catch (error) {
    return { error: "An error occurred" };
  }
};

export async function searchDocuments(query: string) {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      [Query.search("name", query), Query.search("email", query)]
    );

    console.log("Search response:", response);
    return response.documents;
  } catch (error) {
    console.error("Error fetching search results:", error);
    return [];
  }
}

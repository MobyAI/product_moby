import { storage } from "@/lib/firebase/client/config/app";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  getMetadata,
  updateMetadata,
  listAll,
} from "firebase/storage";

//
// Storage Path: users/{userID}/scripts/{scriptID}/audio/{index}.mp3
//

export async function saveAudioBlob(
  userID: string,
  scriptID: string,
  index: number,
  blob: Blob
) {
  const path = `users/${userID}/scripts/${scriptID}/tts-audio/${index}.mp3`;
  const audioRef = ref(storage, path);
  await uploadBytes(audioRef, blob);
}

export async function getAudioBlob(
  userID: string,
  scriptID: string,
  index: number
): Promise<Blob> {
  const path = `users/${userID}/scripts/${scriptID}/tts-audio/${index}.mp3`;
  const audioRef = ref(storage, path);

  const url = await getDownloadURL(audioRef);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch blob from storage URL`);

  const arrayBuffer = await res.arrayBuffer();
  return new Blob([arrayBuffer], { type: "audio/mpeg" });
}

export async function getAudioUrl(
  userID: string,
  scriptID: string,
  index: number
): Promise<string> {
  const path = `users/${userID}/scripts/${scriptID}/tts-audio/${index}.mp3`;
  const audioRef = ref(storage, path);

  const url = await getDownloadURL(audioRef);
  return url;
}

export async function deleteAudioBlob(
  userID: string,
  scriptID: string,
  index: number
) {
  const path = `users/${userID}/scripts/${scriptID}/tts-audio/${index}.mp3`;
  const audioRef = ref(storage, path);
  await deleteObject(audioRef);
}

// Voice samples
interface VoiceSample {
  name: string;
  description: string;
  url: string;
  voiceId: string;
  gender?: "male" | "female" | "non-binary";
  fileName: string;
}

export async function getAllVoiceSamples(): Promise<VoiceSample[]> {
  const path = "voice-samples";
  const folderRef = ref(storage, path);

  try {
    const result = await listAll(folderRef);
    const files = result.items;

    const samplePromises = files.map(async (fileRef) => {
      const [metadata, url] = await Promise.all([
        getMetadata(fileRef),
        getDownloadURL(fileRef),
      ]);

      const titleCase = (str: string) =>
        str
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

      const nameRaw =
        metadata.customMetadata?.name || fileRef.name.replace(".mp3", "");
      const name = titleCase(nameRaw);
      const description =
        metadata.customMetadata?.description || "Description unavailable.";
      const voiceId = metadata.customMetadata?.voiceId || "";
      const gender = metadata.customMetadata?.gender as
        | "male"
        | "female"
        | "non-binary"
        | undefined;

      return {
        name,
        description,
        url,
        voiceId,
        gender,
        fileName: fileRef.name,
      };
    });

    return await Promise.all(samplePromises);
  } catch (error) {
    console.error("Error fetching voice samples:", error);
    return [];
  }
}

export async function saveVoiceSampleBlob(
  voiceId: string,
  voiceName: string,
  blob: Blob,
  description: string,
  gender?: "male" | "female" | "non-binary" | ""
): Promise<void> {
  const safeVoiceName = voiceName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]/g, "");
  const path = `voice-samples/${safeVoiceName}.mp3`;

  const audioRef = ref(storage, path);

  const customMetadata: Record<string, string> = {
    voiceId,
    name: voiceName,
    description,
  };

  if (gender) {
    customMetadata.gender = gender;
  }

  const metadata = {
    customMetadata,
    contentType: "audio/mpeg",
  };

  await uploadBytes(audioRef, blob, metadata);
}

export async function updateVoiceSampleMetadata(
  fileName: string,
  updates: {
    voiceId?: string;
    name?: string;
    description?: string;
    gender?: "male" | "female" | "non-binary";
  }
): Promise<void> {
  const path = `voice-samples/${fileName}`;
  const audioRef = ref(storage, path);

  try {
    // Get current metadata
    const currentMetadata = await getMetadata(audioRef);

    // Merge with updates
    const newCustomMetadata = {
      ...currentMetadata.customMetadata,
      ...Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined)
      ),
    };

    await updateMetadata(audioRef, {
      customMetadata: newCustomMetadata,
    });
  } catch (error) {
    console.error("Error updating voice sample metadata:", error);
    throw error;
  }
}

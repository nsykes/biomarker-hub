import { useState, useCallback, type Dispatch, type SetStateAction } from "react";
import { ApiKeyInfo } from "@/lib/types";
import { createApiKey, revokeApiKey } from "@/lib/db/actions";

export function useApiKeysManager(
  apiKeysList: ApiKeyInfo[],
  setApiKeysList: Dispatch<SetStateAction<ApiKeyInfo[]>>
) {
  const [newKeyName, setNewKeyName] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);

  const handleCreateKey = useCallback(async () => {
    if (!newKeyName.trim()) return;
    setCreatingKey(true);
    try {
      const { key, info } = await createApiKey(newKeyName.trim());
      setNewKeyValue(key);
      setApiKeysList((prev) => [info, ...prev]);
    } catch (err) {
      console.error("Failed to create API key:", err);
    } finally {
      setCreatingKey(false);
    }
  }, [newKeyName, setApiKeysList]);

  const handleRevokeKey = useCallback(async (keyId: string) => {
    setRevokingKeyId(keyId);
    try {
      await revokeApiKey(keyId);
      setApiKeysList((prev) => prev.filter((k) => k.id !== keyId));
    } catch (err) {
      console.error("Failed to revoke:", err);
    } finally {
      setRevokingKeyId(null);
    }
  }, [setApiKeysList]);

  const dismissNewKey = useCallback(() => {
    setNewKeyValue(null);
    setNewKeyName("");
  }, []);

  const copyKey = useCallback(() => {
    if (newKeyValue) {
      navigator.clipboard.writeText(newKeyValue);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    }
  }, [newKeyValue]);

  return {
    newKeyName,
    setNewKeyName,
    creatingKey,
    newKeyValue,
    keyCopied,
    revokingKeyId,
    handleCreateKey,
    handleRevokeKey,
    dismissNewKey,
    copyKey,
  };
}

import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "./ThemedText";
import { Spacing } from "@/constants/theme";

interface Props {
  expiresAt: string;
  onExpire?: () => void;
}

export function FlashCountdown({ expiresAt, onExpire }: Props) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft("Expirado");
        clearInterval(interval);
        onExpire?.();
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <View style={[styles.container, isExpired && styles.expired]}>
      <Feather name="clock" size={14} color={isExpired ? "#999" : "#FF9800"} />
      <ThemedText type="caption" style={[styles.text, isExpired && styles.expiredText]}>
        {timeLeft}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF980020",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  expired: {
    backgroundColor: "#99999920",
  },
  text: {
    color: "#FF9800",
    marginLeft: 4,
    fontWeight: "600",
  },
  expiredText: {
    color: "#999",
  },
});

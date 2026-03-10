import { Text, type TextProps } from "react-native";

import { useTheme } from "@/constants/theme";
import { Typography } from "@/constants/theme";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?:
    | "hero"
    | "h1"
    | "h2"
    | "h3"
    | "h4"
    | "body"
    | "small"
    | "caption"
    | "link";
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "body",
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();

  const getColor = () => {
    if (theme.isDark && darkColor) {
      return darkColor;
    }

    if (!theme.isDark && lightColor) {
      return lightColor;
    }

    if (type === "link") {
      return theme.colors.primary;
    }

    return theme.colors.text.primary;
  };

  const getTypeStyle = () => {
    switch (type) {
      case "hero":
        return Typography.h1;
      case "h1":
        return Typography.h1;
      case "h2":
        return Typography.h2;
      case "h3":
        return Typography.h3;
      case "h4":
        return Typography.h4;
      case "body":
        return Typography.body;
      case "small":
        return Typography.bodySmall;
      case "caption":
        return Typography.caption;
      case "link":
        return Typography.body;
      default:
        return Typography.body;
    }
  };

  return (
    <Text style={[{ color: getColor() }, getTypeStyle(), style]} {...rest} />
  );
}

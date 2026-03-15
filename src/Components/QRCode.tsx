import { Box } from "@mantine/core";
import QRCodeStyling, {
  CornerDotType,
  CornerSquareType,
  DotType,
  DrawType,
  ErrorCorrectionLevel,
  Mode,
  Options,
  TypeNumber,
} from "qr-code-styling";
import { useEffect, useMemo, useRef } from "react";

interface QRCodeProps {
  value?: string;
  options?: Options;
}

export function QRCode({ value, options }: QRCodeProps) {
  const mergedOptions = useMemo<Options>(() => ({
    width: 300,
    height: 300,
    type: "svg" as DrawType,
    data: value,
    qrOptions: {
      typeNumber: 0 as TypeNumber,
      mode: "Byte" as Mode,
      errorCorrectionLevel: "Q" as ErrorCorrectionLevel,
    },
    dotsOptions: {
      color: "var(--mantine-color-text)",
      type: "dots" as DotType,
    },
    backgroundOptions: {
      color: "transparent",
    },
    cornersSquareOptions: {
      color: "var(--mantine-color-immoself-outline)",
      type: "extra-rounded" as CornerSquareType,
    },
    cornersDotOptions: {
      color: "var(--mantine-color-immoself-outline)",
      type: "dot" as CornerDotType,
    },
    ...options,
  }), [value, options]);

  const ref = useRef<HTMLDivElement>(null);
  const qrCode = useMemo(() => new QRCodeStyling(mergedOptions), []);

  useEffect(() => {
    if (ref.current) {
      qrCode.append(ref.current);
    }
  }, [qrCode]);

  useEffect(() => {
    qrCode.update(mergedOptions);
  }, [qrCode, mergedOptions]);

  return <Box ref={ref} />;
}

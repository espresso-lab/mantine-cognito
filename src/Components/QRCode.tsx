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
import { useEffect, useRef } from "react";

interface QRCodeProps {
  value?: string;
  options?: Options;
}

const DEFAULT_OPTIONS: Options = {
  width: 300,
  height: 300,
  type: "svg" as DrawType,
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
    color: "var(--mantine-primary-color-filled)",
    type: "extra-rounded" as CornerSquareType,
  },
  cornersDotOptions: {
    color: "var(--mantine-primary-color-filled)",
    type: "dot" as CornerDotType,
  },
};

export function QRCode({ value, options }: QRCodeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const qrCode = useRef(new QRCodeStyling({ ...DEFAULT_OPTIONS, data: value, ...options }));

  useEffect(() => {
    if (ref.current) qrCode.current.append(ref.current);
  }, []);

  useEffect(() => {
    qrCode.current.update({ ...DEFAULT_OPTIONS, data: value, ...options });
  }, [value, options]);

  return <Box ref={ref} />;
}

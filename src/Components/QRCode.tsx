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
import { useEffect, useRef, useState } from "react";

interface QRCodeProps {
  value?: string;
  options?: Options;
}

export function QRCode({ value, options }: QRCodeProps) {
  const [defaultOptions, setDefaultOptions] = useState<Options>({
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
  });

  useEffect(() => {
    setDefaultOptions((previous) => ({
      ...previous,
      ...options,
    }));
  }, [options]);

  const ref = useRef<HTMLDivElement>(null);
  const [qrCode] = useState<QRCodeStyling>(new QRCodeStyling(defaultOptions));

  useEffect(() => {
    if (ref.current) {
      qrCode.append(ref.current);
    }
  }, [qrCode, ref]);

  useEffect(() => {
    if (!qrCode) return;
    qrCode.update(defaultOptions);
  }, [qrCode, defaultOptions]);
  return <Box ref={ref} />;
}

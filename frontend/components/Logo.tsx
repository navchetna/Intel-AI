import Image from "next/image";

/** Intel wordmark, served from the local public folder. */
export function Logo() {
  return (
    <Image
      src="/intel-logo.webp"
      alt="Intel logo"
      width={72}
      height={30}
      className="h-7 w-auto object-contain"
      priority
    />
  );
}

import Image from "next/image";

/** Intel wordmark, pulled from Wikimedia. */
export function Logo() {
  return (
    <Image
      src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Intel_logo_%282006-2020%29.svg/320px-Intel_logo_%282006-2020%29.svg.png"
      alt="Intel logo"
      width={72}
      height={30}
      className="h-7 w-auto object-contain"
      priority
      unoptimized
    />
  );
}

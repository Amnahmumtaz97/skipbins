import Image from "next/image";

type BinPhotoProps = { size: string; purpose: string; src?: string; alt?: string };

/** Only pass approved product photography with a verified description. */
export function BinPhoto({ size, purpose, src, alt }: BinPhotoProps) {
  if (src && alt) {
    return <Image src={src} alt={alt} fill loading="lazy" className="object-cover" sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 1023px) calc(50vw - 44px), (max-width: 1400px) calc(33vw - 44px), 420px" />;
  }
  return (
    <div className="flex h-full flex-col justify-center bg-[#DDECCB] p-6 text-[#0B3B24]">
      <span className="text-4xl font-black">{size}</span>
      <p className="mt-3 text-sm leading-6">{purpose}</p>
      <p className="mt-3 text-xs font-semibold">Product photography coming soon</p>
    </div>
  );
}

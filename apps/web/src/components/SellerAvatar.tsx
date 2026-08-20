import { Store } from "lucide-react";

type SellerAvatarProps = {
  logoUrl: string | null | undefined;
  iconSize?: number;
};

export function SellerAvatar({ logoUrl, iconSize = 24 }: SellerAvatarProps) {
  return logoUrl ? <img src={logoUrl} alt="" /> : <Store size={iconSize} />;
}

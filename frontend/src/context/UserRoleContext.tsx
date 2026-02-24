import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useAccount } from "wagmi";

export type UserRole = "admin" | "merchant" | "consumer" | null;

interface MerchantInfo {
  id: string;
  walletAddress: string;
  businessName: string;
  category: string;
  status: string;
}

interface UserRoleContextType {
  role: UserRole;
  loading: boolean;
  merchantInfo: MerchantInfo | null;
}

const UserRoleContext = createContext<UserRoleContextType>({
  role: null,
  loading: false,
  merchantInfo: null,
});

export function UserRoleProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(false);
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo | null>(null);

  useEffect(() => {
    if (!address || !isConnected) {
      console.log("❌ Wallet disconnected or address unavailable");
      setRole(null);
      setMerchantInfo(null);
      return;
    }

    const walletAddress = address;
    console.log("🔍 Fetching role for wallet:", walletAddress);

    const fetchRole = async () => {
      setLoading(true);
      try {
        const url = `http://localhost:3001/api/admin/role?wallet=${walletAddress}`;
        console.log("📡 API call:", url);

        const resp = await fetch(url);
        const data = await resp.json();

        console.log("📥 Role response:", data);

        if (data.success && data.role) {
          console.log(`✅ Role set to: ${data.role}`);
          setRole(data.role as UserRole);
          setMerchantInfo(data.merchantInfo ?? null);
        } else {
          console.warn("⚠️ Invalid response, defaulting to consumer");
          setRole("consumer");
          setMerchantInfo(null);
        }
      } catch (err) {
        console.error("❌ Failed to fetch wallet role:", err);
        // Always fallback to consumer on error
        console.log("🔄 Fallback: Setting role to consumer");
        setRole("consumer");
        setMerchantInfo(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [address, isConnected]);

  return (
    <UserRoleContext.Provider value={{ role, loading, merchantInfo }}>
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRole() {
  return useContext(UserRoleContext);
}

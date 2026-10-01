import { useEffect, useRef, type ReactNode, type ComponentType } from "react";
import {
  Coins,
  Utensils,
  BriefcaseBusiness,
  CarFront,
  HeartPulse,
  Ticket,
  ShoppingCart,
  Gift,
  House,
  PawPrint,
  BookOpen,
  Dumbbell,
  Wallet,
  PiggyBank,
  Laptop,
  ReceiptText,
  Tag,
  X,
} from "lucide-react";
import type { Category } from "./api";
export const icons: Record<
  string,
  ComponentType<{ size?: number; strokeWidth?: number }>
> = {
  utensils: Utensils,
  briefcase: BriefcaseBusiness,
  car: CarFront,
  heart: HeartPulse,
  ticket: Ticket,
  "shopping-cart": ShoppingCart,
  gift: Gift,
  house: House,
  "paw-print": PawPrint,
  "book-open": BookOpen,
  dumbbell: Dumbbell,
  wallet: Wallet,
  "piggy-bank": PiggyBank,
  laptop: Laptop,
  receipt: ReceiptText,
  tag: Tag,
};
export const iconLabels: Record<string, string> = {
  utensils: "Alimentação",
  briefcase: "Trabalho",
  car: "Transporte",
  heart: "Saúde",
  ticket: "Lazer",
  "shopping-cart": "Compras",
  gift: "Presente",
  house: "Casa",
  "paw-print": "Pets",
  "book-open": "Educação",
  dumbbell: "Academia",
  wallet: "Carteira",
  "piggy-bank": "Investimentos",
  laptop: "Tecnologia",
  receipt: "Contas",
  tag: "Etiqueta",
};
export const colors: Record<string, string> = {
  gray: "Cinza",
  blue: "Azul",
  purple: "Roxo",
  pink: "Rosa",
  red: "Vermelho",
  orange: "Laranja",
  yellow: "Amarelo",
  green: "Verde",
};
export function Logo() {
  return (
    <span className="logo">
      <Coins size={30} strokeWidth={2.6} />
      <span>FINANCY</span>
    </span>
  );
}
export function CategoryIcon({
  category,
}: {
  category: Pick<Category, "color" | "icon">;
}) {
  const Icon = icons[category.icon] || Tag;
  return (
    <span className={`category-icon ${category.color}`}>
      <Icon size={18} />
    </span>
  );
}
export function Badge({
  category,
}: {
  category: Pick<Category, "color" | "name">;
}) {
  return <span className={`badge ${category.color}`}>{category.name}</span>;
}
export const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
export const dateLabel = (date: string) => date.split("-").reverse().join("/");
export const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
export const today = () => {
  const d = new Date();
  return `${currentMonth()}-${String(d.getDate()).padStart(2, "0")}`;
};
export function Modal({
  title,
  subtitle,
  children,
  close,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => {
      dialog.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            close();
        }
      }}
    >
      <div className="modal-heading">
        <div>
          <h2 id="dialog-title">{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button className="icon-button" aria-label="Fechar" onClick={close}>
          <X size={18} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Empty({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-symbol">
        <Wallet size={26} />
      </span>
      <h3>{title}</h3>
      <p>{detail}</p>
      {action}
    </div>
  );
}
export function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <div className="error-message" role="alert">
      {message}
    </div>
  ) : null;
}

export type User = { id: string; name: string; email: string };
export type Category = {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  transactionCount: number;
};
export type Transaction = {
  id: string;
  description: string;
  amountCents: number;
  type: "INCOME" | "EXPENSE";
  date: string;
  category: Category;
};
export type Dashboard = {
  balanceCents: number;
  incomeCents: number;
  expenseCents: number;
  transactionCount: number;
  recent: Transaction[];
  categories: { category: Category; count: number; amountCents: number }[];
};
export const categoryFields = "id name description color icon transactionCount";
export const transactionFields = `id description amountCents type date category { ${categoryFields} }`;
export function getToken() {
  return (
    localStorage.getItem("financy.token") ??
    sessionStorage.getItem("financy.token")
  );
}
export function saveToken(token: string, remember: boolean) {
  clearToken();
  (remember ? localStorage : sessionStorage).setItem("financy.token", token);
}
export function clearToken() {
  localStorage.removeItem("financy.token");
  sessionStorage.removeItem("financy.token");
}
export async function gql<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(
      import.meta.env.VITE_BACKEND_URL || "http://localhost:4000/graphql",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify({ query, variables }),
      },
    );
  } catch {
    throw new Error(
      "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
    );
  }
  if (!response.ok)
    throw new Error("O servidor não respondeu. Tente novamente.");
  const result = await response.json();
  if (result.errors?.length) {
    if (result.errors[0].extensions?.code === "UNAUTHENTICATED") {
      clearToken();
      window.dispatchEvent(new Event("financy:unauthorized"));
    }
    throw new Error(result.errors[0].message);
  }
  return result.data as T;
}

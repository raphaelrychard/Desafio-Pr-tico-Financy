import { useState, type FormEvent } from "react";
import { ArrowDownCircle, ArrowUpCircle, Check, Plus } from "lucide-react";
import { gql, type Category, type Transaction } from "./api";
import {
  Modal,
  ErrorMessage,
  icons,
  iconLabels,
  colors,
  today,
} from "./components";
export function CategoryForm({
  initial,
  close,
  done,
}: {
  initial?: Category;
  close: () => void;
  done: () => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [icon, setIcon] = useState(initial?.icon || "tag");
  const [color, setColor] = useState(initial?.color || "green");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await gql(
        initial
          ? "mutation($id:ID!,$input:CategoryInput!){updateCategory(id:$id,input:$input){id}}"
          : "mutation($input:CategoryInput!){createCategory(input:$input){id}}",
        { id: initial?.id, input: { name, description, color, icon } },
      );
      done();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={initial ? "Editar categoria" : "Nova categoria"}
      subtitle="Organize suas transações com categorias"
      close={close}
    >
      <form onSubmit={submit} className="stack">
        <ErrorMessage message={error} />
        <label>
          Título
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. Alimentação"
            required
            minLength={2}
            maxLength={100}
          />
        </label>
        <label>
          Descrição <span className="optional">(opcional)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição da categoria"
            maxLength={180}
            rows={2}
          />
        </label>
        <fieldset>
          <legend>Ícone</legend>
          <div className="icon-picker">
            {Object.entries(icons).map(([key, Icon]) => (
              <button
                type="button"
                key={key}
                aria-label={iconLabels[key]}
                aria-pressed={icon === key}
                className={icon === key ? "selected" : ""}
                onClick={() => setIcon(key)}
              >
                <Icon size={19} />
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Cor</legend>
          <div className="color-picker">
            {Object.entries(colors).map(([key, label]) => (
              <button
                type="button"
                key={key}
                className={`swatch ${key}`}
                aria-label={label}
                aria-pressed={color === key}
                onClick={() => setColor(key)}
              >
                {color === key && <Check size={18} />}
              </button>
            ))}
          </div>
        </fieldset>
        <button className="primary full" disabled={busy}>
          {busy ? "Salvando…" : "Salvar"}
        </button>
      </form>
    </Modal>
  );
}
export function TransactionForm({
  initial,
  categories,
  close,
  done,
  newCategory,
}: {
  initial?: Transaction;
  categories: Category[];
  close: () => void;
  done: () => void;
  newCategory: () => void;
}) {
  const [type, setType] = useState<"INCOME" | "EXPENSE">(
    initial?.type || "EXPENSE",
  );
  const [description, setDescription] = useState(initial?.description || "");
  const [amount, setAmount] = useState(
    initial ? (initial.amountCents / 100).toFixed(2).replace(".", ",") : "",
  );
  const [date, setDate] = useState(initial?.date || today());
  const [categoryId, setCategoryId] = useState(initial?.category.id || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^\d+(?:[,.]\d{1,2})?$/.test(amount)) {
      setError("Informe um valor válido, como 125,50.");
      return;
    }
    const cents = Math.round(Number(amount.replace(",", ".")) * 100);
    if (cents <= 0 || cents > 2_000_000_000) {
      setError("O valor deve estar entre R$ 0,01 e R$ 20.000.000,00.");
      return;
    }
    setBusy(true);
    try {
      await gql(
        initial
          ? "mutation($id:ID!,$input:TransactionInput!){updateTransaction(id:$id,input:$input){id}}"
          : "mutation($input:TransactionInput!){createTransaction(input:$input){id}}",
        {
          id: initial?.id,
          input: { description, type, amountCents: cents, date, categoryId },
        },
      );
      done();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={initial ? "Editar transação" : "Nova transação"}
      subtitle="Registre uma entrada ou saída"
      close={close}
    >
      <form onSubmit={submit} className="stack">
        <ErrorMessage message={error} />
        <div
          className="type-picker"
          role="group"
          aria-label="Tipo de transação"
        >
          <button
            type="button"
            className={type === "EXPENSE" ? "selected expense" : ""}
            aria-pressed={type === "EXPENSE"}
            onClick={() => setType("EXPENSE")}
          >
            <ArrowDownCircle size={18} />
            Despesa
          </button>
          <button
            type="button"
            className={type === "INCOME" ? "selected income" : ""}
            aria-pressed={type === "INCOME"}
            onClick={() => setType("INCOME")}
          >
            <ArrowUpCircle size={18} />
            Receita
          </button>
        </div>
        <label>
          Descrição
          <input
            autoFocus
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex. Compras no mercado"
            required
            minLength={2}
            maxLength={100}
          />
        </label>
        <div className="form-columns">
          <label>
            Valor
            <div className="input-prefix">
              <span>R$</span>
              <input
                aria-label="Valor"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                required
              />
            </div>
          </label>
          <label>
            Data
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
        </div>
        <label>
          Categoria
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
          >
            <option value="" disabled>
              Selecione uma categoria
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {categories.length === 0 && (
          <div className="inline-help">
            Crie uma categoria antes de registrar sua transação.
            <button type="button" className="text-button" onClick={newCategory}>
              <Plus size={14} />
              Criar categoria
            </button>
          </div>
        )}
        <button className="primary full" disabled={busy || !categories.length}>
          {busy ? "Salvando…" : "Salvar"}
        </button>
      </form>
    </Modal>
  );
}

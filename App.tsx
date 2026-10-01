import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import {
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  UserRound,
  UserRoundPlus,
  LogIn,
  LogOut,
  Plus,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Search,
  Pencil,
  Trash2,
  Wallet,
  Tag,
  ArrowDownUp,
  CheckCircle2,
  CalendarDays,
} from "lucide-react";
import {
  gql,
  getToken,
  saveToken,
  clearToken,
  categoryFields,
  transactionFields,
  type User,
  type Category,
  type Transaction,
  type Dashboard,
} from "./api";
import {
  Logo,
  CategoryIcon,
  Badge,
  money,
  dateLabel,
  currentMonth,
  Modal,
  Empty,
  ErrorMessage,
} from "./components";
import { CategoryForm, TransactionForm } from "./forms";

function Auth({ registered }: { registered?: boolean }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (registered && password !== confirmation) {
      setError("As senhas não coincidem.");
      return;
    }
    setBusy(true);
    try {
      const response = await gql<Record<string, { token: string; user: User }>>(
        registered
          ? "mutation($name:String!,$email:String!,$password:String!){register(name:$name,email:$email,password:$password){token user{id name email}}}"
          : "mutation($email:String!,$password:String!,$remember:Boolean){login(email:$email,password:$password,remember:$remember){token user{id name email}}}",
        { name, email, password, remember },
      );
      saveToken(response[registered ? "register" : "login"].token, remember);
      window.dispatchEvent(new Event("financy:login"));
      navigate("/");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <Link to="/" aria-label="Financy início">
        <Logo />
      </Link>
      <section className="auth-card">
        <header>
          <h1>{registered ? "Criar conta" : "Fazer login"}</h1>
          <p>
            {registered
              ? "Comece a controlar suas finanças"
              : "Entre na sua conta para continuar"}
          </p>
        </header>
        <form className="stack" onSubmit={submit}>
          <ErrorMessage message={error} />
          {registered && (
            <label>
              Nome completo
              <div className="input-icon">
                <UserRound size={17} />
                <input
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  minLength={2}
                  maxLength={100}
                  required
                />
              </div>
            </label>
          )}
          <label>
            E-mail
            <div className="input-icon">
              <Mail size={17} />
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mail@exemplo.com"
                required
                maxLength={254}
              />
            </div>
          </label>
          <label>
            Senha
            <div className="input-icon">
              <LockKeyhole size={17} />
              <input
                type={show ? "text" : "password"}
                autoComplete={registered ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                minLength={registered ? 8 : 1}
                maxLength={72}
                required
              />
              <button
                type="button"
                className="eye"
                aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                onClick={() => setShow(!show)}
              >
                {show ? <Eye size={17} /> : <EyeOff size={17} />}
              </button>
            </div>
            {registered && (
              <small>A senha deve ter pelo menos 8 caracteres</small>
            )}
          </label>
          {registered && (
            <label>
              Confirmar senha
              <div className="input-icon">
                <LockKeyhole size={17} />
                <input
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  placeholder="Digite a senha novamente"
                  required
                  maxLength={72}
                />
              </div>
            </label>
          )}
          {!registered && (
            <div className="login-options">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Lembrar-me
              </label>
            </div>
          )}
          <button className="primary full" disabled={busy}>
            {busy ? "Aguarde…" : registered ? "Cadastrar" : "Entrar"}
          </button>
        </form>
        <div className="divider">
          <span>ou</span>
        </div>
        <p className="auth-switch">
          {registered ? "Já tem uma conta?" : "Ainda não tem uma conta?"}
        </p>
        <Link
          className="button secondary full"
          to={registered ? "/" : "/cadastro"}
        >
          {registered ? <LogIn size={17} /> : <UserRoundPlus size={17} />}
          {registered ? "Fazer login" : "Criar conta"}
        </Link>
      </section>
    </main>
  );
}
type ModalState =
  | { kind: "transaction"; item?: Transaction }
  | { kind: "category"; item?: Category }
  | {
      kind: "delete";
      entity: "transaction" | "category";
      id: string;
      name: string;
    }
  | null;
function Workspace({
  user,
  setUser,
  logout,
}: {
  user: User;
  setUser: (user: User) => void;
  logout: () => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [revision, setRevision] = useState(0);
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const refresh = useCallback(() => setRevision((r) => r + 1), []);
  useEffect(() => {
    let active = true;
    gql<{ categories: Category[] }>(
      `query { categories { ${categoryFields} } }`,
    )
      .then((r) => {
        if (active) {
          setCategories(r.categories);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [revision]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(id);
  }, [toast]);
  function done() {
    setModal(null);
    refresh();
    setToast("Alterações salvas com sucesso.");
  }
  const tx = () => setModal({ kind: "transaction" });
  return (
    <>
      <header className="app-header">
        <div className="nav-inner">
          <Link to="/" aria-label="Financy início">
            <Logo />
          </Link>
          <nav aria-label="Navegação principal">
            <NavLink to="/" end>
              Dashboard
            </NavLink>
            <NavLink to="/transacoes">Transações</NavLink>
            <NavLink to="/categorias">Categorias</NavLink>
          </nav>
          <Link
            to="/perfil"
            className="avatar"
            aria-label="Meu perfil"
            title={user.name}
          >
            {user.name
              .trim()
              .split(/\s+/)
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </Link>
        </div>
      </header>
      <main className="workspace">
        <ErrorMessage message={error} />
        {error && (
          <button className="text-button" onClick={refresh}>
            Tentar novamente
          </button>
        )}
        <Routes>
          <Route
            path="/"
            element={<DashboardPage revision={revision} create={tx} />}
          />
          <Route
            path="/transacoes"
            element={
              <TransactionsPage
                categories={categories}
                revision={revision}
                create={tx}
                edit={(item) => setModal({ kind: "transaction", item })}
                remove={(item) =>
                  setModal({
                    kind: "delete",
                    entity: "transaction",
                    id: item.id,
                    name: item.description,
                  })
                }
              />
            }
          />
          <Route
            path="/categorias"
            element={
              <CategoriesPage
                categories={categories}
                create={() => setModal({ kind: "category" })}
                edit={(item) => setModal({ kind: "category", item })}
                remove={(item) =>
                  setModal({
                    kind: "delete",
                    entity: "category",
                    id: item.id,
                    name: item.name,
                  })
                }
              />
            }
          />
          <Route
            path="/perfil"
            element={
              <Profile
                user={user}
                update={(u) => {
                  setUser(u);
                  setToast("Perfil atualizado com sucesso.");
                }}
                logout={logout}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {modal?.kind === "category" && (
        <CategoryForm
          initial={modal.item}
          close={() => setModal(null)}
          done={done}
        />
      )}
      {modal?.kind === "transaction" && (
        <TransactionForm
          initial={modal.item}
          categories={categories}
          close={() => setModal(null)}
          done={done}
          newCategory={() => setModal({ kind: "category" })}
        />
      )}
      {modal?.kind === "delete" && (
        <DeleteDialog
          entity={modal.entity}
          id={modal.id}
          name={modal.name}
          close={() => setModal(null)}
          done={() => {
            setModal(null);
            refresh();
            setToast("Item excluído com sucesso.");
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          {toast}
        </div>
      )}
    </>
  );
}
function DashboardPage({
  revision,
  create,
}: {
  revision: number;
  create: () => void;
}) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    gql<{ dashboard: Dashboard }>(
      `query($month:String!) { dashboard(month:$month) { balanceCents incomeCents expenseCents transactionCount recent { ${transactionFields} } categories { category { ${categoryFields} } count amountCents } } }`,
      { month: currentMonth() },
    )
      .then((r) => {
        if (active) {
          setData(r.dashboard);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [revision, retry]);
  if (error)
    return (
      <>
        <ErrorMessage message={error} />
        <button className="secondary" onClick={() => setRetry((r) => r + 1)}>
          Tentar novamente
        </button>
      </>
    );
  if (!data)
    return (
      <div className="loading" role="status">
        Carregando suas finanças…
      </div>
    );
  return (
    <div className="dashboard">
      <div className="stats">
        <Stat
          label="Saldo total"
          value={money(data.balanceCents)}
          icon={<Wallet size={20} />}
          tone="purple"
        />
        <Stat
          label="Receitas do mês"
          value={money(data.incomeCents)}
          icon={<ArrowUpCircle size={20} />}
          tone="green"
        />
        <Stat
          label="Despesas do mês"
          value={money(data.expenseCents)}
          icon={<ArrowDownCircle size={20} />}
          tone="red"
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Transações recentes</h2>
            <Link to="/transacoes">
              Ver todas
              <ChevronRight size={15} />
            </Link>
          </div>
          {data.recent.length ? (
            <div className="recent-list">
              {data.recent.map((t) => (
                <div className="recent-row" key={t.id}>
                  <CategoryIcon category={t.category} />
                  <div className="recent-description">
                    <strong>{t.description}</strong>
                    <small>{dateLabel(t.date)}</small>
                  </div>
                  <Badge category={t.category} />
                  <span className="recent-value">
                    {t.type === "INCOME" ? "+" : "−"} {money(t.amountCents)}
                    {t.type === "INCOME" ? (
                      <ArrowUpCircle className="positive" size={15} />
                    ) : (
                      <ArrowDownCircle className="negative" size={15} />
                    )}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="Seu controle financeiro começa aqui"
              detail="Registre sua primeira transação para acompanhar suas finanças."
            />
          )}
          <button className="panel-footer text-button" onClick={create}>
            <Plus size={17} />
            Nova transação
          </button>
        </section>
        <section className="panel category-summary">
          <div className="panel-heading">
            <h2>Categorias</h2>
            <Link to="/categorias">
              Gerenciar
              <ChevronRight size={15} />
            </Link>
          </div>
          {data.categories.length ? (
            <div className="summary-list">
              {data.categories.slice(0, 6).map((g) => (
                <div key={g.category.id} className="summary-row">
                  <Badge category={g.category} />
                  <span>
                    {g.count} {g.count === 1 ? "item" : "itens"}
                  </span>
                  <strong>{money(g.amountCents)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="Tudo em seu lugar"
              detail="As categorias usadas neste mês aparecem aqui."
            />
          )}
        </section>
      </div>
    </div>
  );
}
function Stat({
  label,
  value,
  icon,
  tone = "gray",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: string;
}) {
  return (
    <div className="stat">
      <div className={`stat-label ${tone}`}>
        {icon}
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
    </div>
  );
}
function TransactionsPage({
  categories,
  revision,
  create,
  edit,
  remove,
}: {
  categories: Category[];
  revision: number;
  create: () => void;
  edit: (t: Transaction) => void;
  remove: (t: Transaction) => void;
}) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [month, setMonth] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    const id = setTimeout(() => {
      gql<{ transactions: { items: Transaction[]; total: number } }>(
        `query($filter:TransactionFilter){transactions(filter:$filter){items{${transactionFields}} total}}`,
        {
          filter: {
            ...(search && { search }),
            ...(type && { type }),
            ...(categoryId && { categoryId }),
            ...(month && { month }),
            page,
            pageSize: 10,
          },
        },
      )
        .then((r) => {
          if (active) {
            setItems(r.transactions.items);
            setTotal(r.transactions.total);
            setError("");
            if (page > 1 && r.transactions.total <= (page - 1) * 10)
              setPage((p) => p - 1);
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 180);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [revision, search, type, categoryId, month, page, retry]);
  const totalPages = Math.max(1, Math.ceil(total / 10));
  const pageNumbers = [
    ...new Set(
      [1, page - 1, page, page + 1, totalPages].filter(
        (p) => p >= 1 && p <= totalPages,
      ),
    ),
  ].sort((a, b) => a - b);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Transações</h1>
          <p>Gerencie todas as suas transações financeiras</p>
        </div>
        <button className="primary" onClick={create}>
          <Plus size={17} />
          Nova transação
        </button>
      </div>
      <section className="filters panel" aria-label="Filtros de transações">
        <label>
          Buscar
          <div className="input-icon">
            <Search size={16} />
            <input
              placeholder="Buscar por descrição"
              value={search}
              maxLength={100}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </label>
        <label>
          Tipo
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            <option value="INCOME">Entrada</option>
            <option value="EXPENSE">Saída</option>
          </select>
        </label>
        <label>
          Categoria
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Período
          <div className="month-filter">
            <input
              aria-label="Período"
              type="month"
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                setPage(1);
              }}
            />
            {month && (
              <button
                className="clear-month"
                onClick={() => {
                  setMonth("");
                  setPage(1);
                }}
                aria-label="Limpar período"
              >
                ×
              </button>
            )}
          </div>
        </label>
      </section>
      <ErrorMessage message={error} />
      {error && (
        <button className="text-button" onClick={() => setRetry((r) => r + 1)}>
          Tentar novamente
        </button>
      )}
      <section className="panel table-panel" aria-busy={loading}>
        {loading ? (
          <div className="loading" role="status">
            Carregando transações…
          </div>
        ) : items.length ? (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Data</th>
                    <th>Categoria</th>
                    <th>Tipo</th>
                    <th className="align-right">Valor</th>
                    <th className="align-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <div className="description-cell">
                          <CategoryIcon category={t.category} />
                          <strong>{t.description}</strong>
                        </div>
                      </td>
                      <td className="muted">{dateLabel(t.date)}</td>
                      <td>
                        <Badge category={t.category} />
                      </td>
                      <td>
                        <span
                          className={`transaction-type ${t.type === "INCOME" ? "positive" : "negative"}`}
                        >
                          {t.type === "INCOME" ? (
                            <ArrowUpCircle size={15} />
                          ) : (
                            <ArrowDownCircle size={15} />
                          )}
                          {t.type === "INCOME" ? "Entrada" : "Saída"}
                        </span>
                      </td>
                      <td className="align-right amount">
                        {t.type === "INCOME" ? "+" : "−"} {money(t.amountCents)}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-button danger"
                            aria-label={`Excluir ${t.description}`}
                            onClick={() => remove(t)}
                          >
                            <Trash2 size={16} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Editar ${t.description}`}
                            onClick={() => edit(t)}
                          >
                            <Pencil size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span>
                {(page - 1) * 10 + 1} a {Math.min(page * 10, total)} | {total}{" "}
                resultados
              </span>
              <div>
                <button
                  aria-label="Página anterior"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft size={16} />
                </button>
                {pageNumbers.map((p, i) => (
                  <span className="page-number" key={p}>
                    {i > 0 && p - pageNumbers[i - 1] > 1 && <span>…</span>}
                    <button
                      className={page === p ? "active" : ""}
                      aria-label={`Página ${p}`}
                      aria-current={page === p ? "page" : undefined}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  </span>
                ))}
                <button
                  aria-label="Próxima página"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <Empty
            title="Nenhuma transação encontrada"
            detail={
              search || type || categoryId || month
                ? "Tente ajustar os filtros para encontrar o que procura."
                : "Adicione sua primeira receita ou despesa."
            }
            action={
              <button className="text-button" onClick={create}>
                <Plus size={16} />
                Nova transação
              </button>
            }
          />
        )}
      </section>
    </>
  );
}
function CategoriesPage({
  categories,
  create,
  edit,
  remove,
}: {
  categories: Category[];
  create: () => void;
  edit: (c: Category) => void;
  remove: (c: Category) => void;
}) {
  const total = categories.reduce((s, c) => s + c.transactionCount, 0);
  const top = [...categories].sort(
    (a, b) => b.transactionCount - a.transactionCount,
  )[0];
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Categorias</h1>
          <p>Organize suas transações por categorias</p>
        </div>
        <button className="primary" onClick={create}>
          <Plus size={17} />
          Nova categoria
        </button>
      </div>
      <div className="stats category-stats">
        <Stat
          label="Total de categorias"
          value={String(categories.length)}
          icon={<Tag size={20} />}
        />
        <Stat
          label="Total de transações"
          value={String(total)}
          icon={<ArrowDownUp size={20} />}
          tone="purple"
        />
        <Stat
          label="Categoria mais utilizada"
          value={top?.transactionCount ? top.name : "—"}
          icon={
            top?.transactionCount ? (
              <CategoryIcon category={top} />
            ) : (
              <Tag size={20} />
            )
          }
          tone={top?.color}
        />
      </div>
      {categories.length ? (
        <div className="category-grid">
          {categories.map((c) => (
            <article className="category-card panel" key={c.id}>
              <div className="category-top">
                <CategoryIcon category={c} />
                <div className="row-actions">
                  <button
                    className="icon-button danger"
                    aria-label={`Excluir ${c.name}`}
                    onClick={() => remove(c)}
                  >
                    <Trash2 size={15} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Editar ${c.name}`}
                    onClick={() => edit(c)}
                  >
                    <Pencil size={15} />
                  </button>
                </div>
              </div>
              <h2>{c.name}</h2>
              <p>{c.description || "Sem descrição"}</p>
              <footer>
                <Badge category={c} />
                <span>
                  {c.transactionCount}{" "}
                  {c.transactionCount === 1 ? "item" : "itens"}
                </span>
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <section className="panel">
          <Empty
            title="Dê um lugar para cada transação"
            detail="Crie categorias como Alimentação, Transporte ou Salário."
            action={
              <button className="primary" onClick={create}>
                <Plus size={17} />
                Nova categoria
              </button>
            }
          />
        </section>
      )}
    </>
  );
}
function Profile({
  user,
  update,
  logout,
}: {
  user: User;
  update: (u: User) => void;
  logout: () => void;
}) {
  const [name, setName] = useState(user.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await gql<{ updateProfile: User }>(
        "mutation($name:String!){updateProfile(name:$name){id name email}}",
        { name },
      );
      update(r.updateProfile);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="profile-card panel">
      <header>
        <div className="avatar large">
          {user.name
            .trim()
            .split(/\s+/)
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </div>
        <h1>{user.name}</h1>
        <p>{user.email}</p>
      </header>
      <form className="stack" onSubmit={submit}>
        <ErrorMessage message={error} />
        <label>
          Nome completo
          <div className="input-icon">
            <UserRound size={17} />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={100}
            />
          </div>
        </label>
        <label>
          E-mail
          <div className="input-icon disabled">
            <Mail size={17} />
            <input value={user.email} disabled />
          </div>
          <small>O e-mail não pode ser alterado</small>
        </label>
        <button className="primary full" disabled={busy}>
          {busy ? "Salvando…" : "Salvar alterações"}
        </button>
      </form>
      <button className="secondary full logout" onClick={logout}>
        <LogOut size={16} />
        Sair da conta
      </button>
    </section>
  );
}
function DeleteDialog({
  entity,
  id,
  name,
  close,
  done,
}: {
  entity: "transaction" | "category";
  id: string;
  name: string;
  close: () => void;
  done: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    setBusy(true);
    setError("");
    try {
      await gql(
        entity === "transaction"
          ? "mutation($id:ID!){deleteTransaction(id:$id)}"
          : "mutation($id:ID!){deleteCategory(id:$id)}",
        { id },
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
      title={`Excluir ${entity === "transaction" ? "transação" : "categoria"}?`}
      close={close}
    >
      <p className="delete-description">
        “{name}” será excluída. Esta ação não pode ser desfeita.
      </p>
      <ErrorMessage message={error} />
      <div className="dialog-actions">
        <button className="secondary" onClick={close} disabled={busy}>
          Cancelar
        </button>
        <button className="danger-button" onClick={remove} disabled={busy}>
          {busy ? "Excluindo…" : "Excluir"}
        </button>
      </div>
    </Modal>
  );
}
export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(getToken()));
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const load = useCallback(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    gql<{ me: User }>("query{me{id name email}}")
      .then((r) => {
        setUser(r.me);
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    load();
    const unauthorized = () => {
      setUser(null);
      setLoading(false);
      navigate("/");
    };
    window.addEventListener("financy:login", load);
    window.addEventListener("financy:unauthorized", unauthorized);
    return () => {
      window.removeEventListener("financy:login", load);
      window.removeEventListener("financy:unauthorized", unauthorized);
    };
  }, [load, navigate]);
  if (loading)
    return (
      <main className="boot">
        <Logo />
        <p role="status">Carregando…</p>
      </main>
    );
  if (user)
    return (
      <Workspace
        user={user}
        setUser={setUser}
        logout={() => {
          clearToken();
          setUser(null);
          setError("");
          navigate("/");
        }}
      />
    );
  if (error && getToken())
    return (
      <main className="boot">
        <Logo />
        <ErrorMessage message={error} />
        <button className="primary" onClick={load}>
          Tentar novamente
        </button>
        <button
          className="text-button"
          onClick={() => {
            clearToken();
            setError("");
          }}
        >
          Voltar ao login
        </button>
      </main>
    );
  return (
    <Routes>
      <Route path="/" element={<Auth key="login" />} />
      <Route path="/cadastro" element={<Auth key="register" registered />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

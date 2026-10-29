import { useMemo, useState } from "react";
import {
  PROJECTS,
  OPERATORS,
  SOURCES,
  STATUS_TONE,
  isFleet,
  type Project,
  type StatusKey,
} from "./data";
import "./App.css";

type View = "todos" | "pipeline" | "pr" | "frotas";
type SortKey = "mw" | "uf" | "status" | "nome";

const CONSTRUCTION_MW = [
  { label: "Fortaleza/CE", value: 227, meta: "JLL 2026 — 200 MW pré-locados TikTok" },
  { label: "SP/Barueri", value: 222, meta: "JLL 2026" },
  { label: "Campinas", value: 195, meta: "JLL 2026" },
];

function StatusBadge({ status }: { status: StatusKey }) {
  return <span className={`badge badge-${STATUS_TONE[status]}`}>{status}</span>;
}

function BarChart({
  items,
  unit,
}: {
  items: { label: string; value: number; meta?: string; display?: string }[];
  unit?: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="bars">
      {items.map((item) => (
        <div className="bar-row" key={item.label} title={item.meta}>
          <div className="bar-label">{item.label}</div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
          <div className="bar-value">
            {item.display ?? `${item.value}${unit ? ` ${unit}` : ""}`}
          </div>
        </div>
      ))}
    </div>
  );
}

function PieChart({
  parts,
}: {
  parts: { label: string; value: number }[];
}) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const colors = ["#1a5c4a", "#2a7a62", "#3d8f5f", "#c4a35a", "#8b7355", "#6b7280", "#b45309"];
  let acc = 0;
  const slices = parts.map((p, i) => {
    const start = (acc / total) * 360;
    acc += p.value;
    const end = (acc / total) * 360;
    return { ...p, start, end, color: colors[i % colors.length] };
  });

  const gradient = slices
    .map((s) => `${s.color} ${s.start}deg ${s.end}deg`)
    .join(", ");

  return (
    <div className="pie-wrap">
      <div className="pie" style={{ background: `conic-gradient(${gradient})` }} />
      <ul className="pie-legend">
        {slices.map((s) => (
          <li key={s.label}>
            <span className="swatch" style={{ background: s.color }} />
            <span>
              {s.label} <em>{s.value}</em>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function App() {
  const [uf, setUf] = useState("TODOS");
  const [status, setStatus] = useState("TODOS");
  const [q, setQ] = useState("");
  const [view, setView] = useState<View>("todos");
  const [sort, setSort] = useState<SortKey>("mw");

  const ufs = useMemo(() => {
    const set = new Set(PROJECTS.map((p) => p.uf));
    return ["TODOS", ...Array.from(set).sort()];
  }, []);

  const statuses = useMemo(() => {
    const set = new Set(PROJECTS.map((p) => p.status));
    return ["TODOS", ...Array.from(set)];
  }, []);

  const filtered = useMemo(() => {
    let rows = PROJECTS.filter((p) => {
      if (view === "pipeline") {
        if (p.tipo === "edge" || isFleet(p)) return false;
      }
      if (view === "pr" && !p.pr) return false;
      if (view === "frotas" && !isFleet(p)) return false;
      if (uf !== "TODOS" && p.uf !== uf) return false;
      if (status !== "TODOS" && p.status !== status) return false;
      if (q.trim()) {
        const hay = `${p.nome} ${p.dono} ${p.cidade} ${p.uf} ${p.status}`.toLowerCase();
        if (!hay.includes(q.trim().toLowerCase())) return false;
      }
      return true;
    });

    rows = [...rows].sort((a, b) => {
      if (sort === "mw") return b.mwSort - a.mwSort;
      if (sort === "uf") return a.uf.localeCompare(b.uf) || a.nome.localeCompare(b.nome);
      if (sort === "status")
        return a.status.localeCompare(b.status) || a.nome.localeCompare(b.nome);
      return a.nome.localeCompare(b.nome);
    });
    return rows;
  }, [uf, status, q, view, sort]);

  const byUfBars = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of PROJECTS) {
      if (p.tipo === "edge") continue;
      if (p.nome.includes("frota")) continue;
      if (p.uf === "BR") continue;
      map[p.uf] = (map[p.uf] || 0) + 1;
    }
    return Object.entries(map)
      .map(([label, value]) => ({ label, value, display: String(value) }))
      .sort((a, b) => b.value - a.value);
  }, []);

  const byStatusPie = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of PROJECTS) {
      if (p.nome.includes("frota")) continue;
      map[p.status] = (map[p.status] || 0) + 1;
    }
    return Object.entries(map)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, []);

  function clearFilters() {
    setUf("TODOS");
    setStatus("TODOS");
    setQ("");
    setView("todos");
    setSort("mw");
  }

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">Dossiê · corte 29/10/2026 · America/Sao_Paulo</p>
        <h1>Data centers no Brasil — ênfase Paraná</h1>
        <p className="lede">
          Inventário visual com fontes: capacidade instalada e em obras (JLL), fila de energia
          (EPE), projetos nomeados de hyperscale/IA, frotas dos operadores e todos os sites
          mapeados no Paraná — sem inventar MW.
        </p>
        <nav className="toc">
          <a href="#leitura">Leitura rápida</a>
          <a href="#kpis">KPIs</a>
          <a href="#onde">Onde se constrói</a>
          <a href="#parana">Paraná</a>
          <a href="#tabela">Tabela</a>
          <a href="#censo">Operadores</a>
          <a href="#redata">Redata</a>
          <a href="#fontes">Fontes</a>
        </nav>
      </header>

      <section id="leitura" className="section">
        <h2>Leitura rápida</h2>
        <div className="callout">
          <strong>Corte 29/10/2026.</strong> O Brasil tem 706 MW instalados e 660 MW em
          construção (JLL, 1º sem/2026), com 4.621 MW no pipeline imobiliário — e 56 GW em
          pedidos de conexão à rede (EPE). Isso não é o mesmo que “aprovado e vai sair”: a
          maior parte do volume anunciado ainda está em licenciamento, parecer de rede ou
          terreno. No Paraná, só dois projetos novos de escala (RT-One Maringá e DataSpots
          Bateias) aparecem com MW/investimento públicos; o estoque atual é colocation/edge
          pequeno em Curitiba, Maringá, Londrina e Foz.
        </div>
        <p className="body">
          Metodologia: cada linha nomeada tem link-fonte. MW sem divulgação oficial ficam
          como “Não divulgado”. Frotas agregadas (Ascenty, Scala etc.) resumem dezenas de
          sites sem listar cada predinho de edge; o Paraná lista site a site. Coloprice
          (01/10/2026) rastreia 245 facilities / 126 operadores — este dossiê cobre os
          projetos com parâmetro público + o censo por operador.
        </p>
      </section>

      <section id="kpis" className="section">
        <h2>KPIs de mercado</h2>
        <p className="caption">Fonte primária: JLL Data Center Brasil 2026 (ago/2026), salvo nota.</p>
        <p className="body">
          Capacidade comercial de colocation/hyperscale medida em MW de TI. A fila de 56 GW
          é pedido de acesso elétrico, não MW em obra.
        </p>
        <div className="metrics">
          <div className="metric">
            <div className="metric-value">706 MW</div>
            <div className="metric-label">Instalados</div>
            <div className="metric-detail">1º sem/2026 · JLL</div>
          </div>
          <div className="metric">
            <div className="metric-value">660 MW</div>
            <div className="metric-label">Em construção</div>
            <div className="metric-detail">56% pré-locados · JLL</div>
          </div>
          <div className="metric">
            <div className="metric-value">4.621 MW</div>
            <div className="metric-label">Pipeline imobiliário</div>
            <div className="metric-detail">JLL</div>
          </div>
          <div className="metric">
            <div className="metric-value">56 GW</div>
            <div className="metric-label">Pedidos de rede</div>
            <div className="metric-detail">EPE · VEJA</div>
          </div>
        </div>
        <div className="grid-2">
          <dl className="props">
            <div>
              <dt>Vacância nacional</dt>
              <dd>4%</dd>
            </div>
            <div>
              <dt>Entregas 1º sem/2026</dt>
              <dd>106 MW (75 Campinas + 31 SP/Barueri)</dd>
            </div>
            <div>
              <dt>Previsão 2º sem/2026</dt>
              <dd>+134 MW · ~US$ 8 bi no ano</dd>
            </div>
            <div>
              <dt>Invest. até 2030 (em obras)</dt>
              <dd>~US$ 17,4 bi (R$ 89 bi)</dd>
            </div>
            <div>
              <dt>Share LatAm</dt>
              <dd>~50% da capacidade regional</dd>
            </div>
            <div>
              <dt>Facilities rastreadas</dt>
              <dd>245 (224 live · 21 pipeline) · Coloprice</dd>
            </div>
          </dl>
          <dl className="props">
            <div>
              <dt>Colocation share (ops)</dt>
              <dd>Ascenty 30% · ODATA 20% · Scala 18%</dd>
            </div>
            <div>
              <dt>Equinix + Elea</dt>
              <dd>9% cada</dd>
            </div>
            <div>
              <dt>Pipeline por player (JLL)</dt>
              <dd>Scala ~800 MW · Ascenty 520 · Omnia 500 · ODATA 480 · Elea 430</dd>
            </div>
            <div>
              <dt>Hyperscaler em colocation</dt>
              <dd>780 MW (1º sem/2026)</dd>
            </div>
            <div>
              <dt>Redata</dt>
              <dd>Lei 15.504/2026 sancionada 15/09/2026</dd>
            </div>
            <div>
              <dt>PRODATA-PR</dt>
              <dd>PL 55/2026 — em comissões, não sancionado</dd>
            </div>
          </dl>
        </div>
      </section>

      <section id="onde" className="section">
        <h2>Onde se constrói agora</h2>
        <p className="caption">
          MW em construção por submercado (JLL). Ranking = contagem de projetos nomeados
          neste dossiê (sem frotas/edge).
        </p>
        <div className="grid-2">
          <div className="panel">
            <h3>MW em construção (JLL)</h3>
            <BarChart
              items={CONSTRUCTION_MW.map((c) => ({
                ...c,
                display: `${c.value} MW`,
              }))}
            />
          </div>
          <div className="panel">
            <h3>Projetos nomeados por UF</h3>
            <BarChart items={byUfBars} />
          </div>
        </div>
        <p className="body">
          Fortaleza dispara porque concentra o DC TikTok (200 MW TI fase 1). SP/Barueri e
          Campinas seguem como hub estrutural. O gráfico da direita conta projetos nomeados
          por UF neste inventário — não é MW.
        </p>
        <div className="panel">
          <h3>Status dos projetos nomeados</h3>
          <PieChart parts={byStatusPie} />
        </div>
      </section>

      <section id="parana" className="section">
        <h2>Paraná em detalhe</h2>
        <div className="callout warn">
          <strong>Dois projetos novos de escala; resto é estoque pequeno.</strong> RT-One
          Maringá (R$ 6 bi, até 400+ MW) está em análise preliminar no IAT, sem LP/LI/LO, com
          MPF investigando água/Guarani. DataSpots Bricklin em Bateias/Campo Largo (100 MW,
          R$ 6 bi) tem parecer ONS condicionado ao 3º transformador (2028) e ops estimadas
          2029 — lastro financeiro questionado em reportagens. Nenhum hyperscale novo opera
          ainda no estado.
        </div>
        <div className="grid-2">
          <div className="panel">
            <h3>Projetos novos</h3>
            <ul className="rows">
              <li>
                <div>
                  <strong>RT-One Maringá</strong>
                  <span>100→400+ MW · R$ 6 bi · ZPE · linha Itaipu-Sarandi</span>
                </div>
                <StatusBadge status="Licenciamento" />
              </li>
              <li>
                <div>
                  <strong>DataSpots Bricklin (Bateias)</strong>
                  <span>100 MW · R$ 6 bi · SE Bateias 138 kV · ops ~2029</span>
                </div>
                <StatusBadge status="Rede aprovada" />
              </li>
            </ul>
          </div>
          <div className="panel">
            <h3>Estoque operacional mapeado</h3>
            <ul className="rows compact">
              {[
                ["Elea CTA1 — Curitiba", "1,7 MW"],
                ["Cirion CUR1 — Curitiba", ">1 MW · 133 racks"],
                ["NextStream CWBCT01 — Curitiba", "0,7 MW"],
                ["Celepar / BR.Digital / ETH — Curitiba", "MW n/d"],
                ["GetCard / UEM — Maringá", "edge / acadêmico"],
                ["Sercomtel/Persis — Londrina", "edge"],
                ["PTI — Foz do Iguaçu", "campus tecnológico"],
                ["UEPG — Ponta Grossa", "acadêmico"],
              ].map(([t, d]) => (
                <li key={t}>
                  <div>
                    <strong>{t}</strong>
                    <span>{d}</span>
                  </div>
                  <StatusBadge status="Operando" />
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="panel">
          <h3>Aprovação, energia e incentivos no PR</h3>
          <ul className="checklist">
            <li className="todo">
              <span>Licenciamento ambiental: IAT (Instituto Água e Terra). RT-One ainda sem LP/LI/LO.</span>
              <em>status em 2026</em>
            </li>
            <li className="todo">
              <span>
                Conexão elétrica: DataSpots com parecer ONS (condicional); RT-One sem
                autorização pública de conexão Itaipu/SIN confirmada.
              </span>
              <em>ONS / Copel</em>
            </li>
            <li className="todo">
              <span>
                PRODATA-PR (PL 55/2026): incentivos de ICMS sob contrapartidas — aprovado em
                comissões (ago e out/2026), ainda não é lei.
              </span>
              <em>ALEP</em>
            </li>
            <li className="done">
              <span>
                Redata federal (Lei 15.504/2026): suspensão de tributos sobre equipamentos —
                habilitação ainda depende de regulamento da Receita.
              </span>
              <em>sancionado 15/09/2026</em>
            </li>
            <li className="done">
              <span>
                Vantagens estruturais: matriz hídrica (Itaipu), fibra, clima e custo de terra
                fora do eixo SP — citados por RT-One e DataSpots.
              </span>
              <em>estrutural</em>
            </li>
          </ul>
        </div>
      </section>

      <section id="tabela" className="section">
        <h2>Tabela filtrável de projetos</h2>
        <p className="caption">
          Use os filtros. Cada linha tem fonte. Frotas agregam dezenas de sites; use a visão
          Paraná para o inventário local completo.
        </p>

        <div className="segmented" role="tablist">
          {(
            [
              ["todos", "Todos nomeados"],
              ["pipeline", "Pipeline / escala"],
              ["pr", "Só Paraná"],
              ["frotas", "Frotas operadores"],
            ] as [View, string][]
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              className={view === v ? "active" : ""}
              onClick={() => setView(v)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="filters">
          <label>
            Estado
            <select value={uf} onChange={(e) => setUf(e.target.value)}>
              {ufs.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ordenar
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="mw">MW (maior)</option>
              <option value="uf">UF</option>
              <option value="status">Status</option>
              <option value="nome">Nome</option>
            </select>
          </label>
          <label>
            Buscar
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="dono, cidade, projeto…"
            />
          </label>
        </div>

        <div className="toolbar">
          <button type="button" className="btn" onClick={clearFilters}>
            Limpar filtros
          </button>
          <span className="count">{filtered.length} linha(s) visíveis</span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Projeto</th>
                <th>Dono</th>
                <th>Local</th>
                <th>MW</th>
                <th>Investimento</th>
                <th>Status</th>
                <th>Aprovação / nota</th>
                <th>Fonte</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p: Project) => (
                <tr key={p.id} className={p.pr ? "pr-row" : undefined}>
                  <td className="cell-name">{p.nome}</td>
                  <td>{p.dono}</td>
                  <td>
                    {p.cidade} · {p.uf}
                  </td>
                  <td className="num">{p.mw}</td>
                  <td className="num">{p.investimento}</td>
                  <td>
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="cell-note">{p.aprovacao}</td>
                  <td>
                    <a href={p.href} target="_blank" rel="noopener noreferrer">
                      {p.fonte}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="censo" className="section">
        <h2>Censo de operadores (Coloprice, 01/10/2026)</h2>
        <p className="caption">
          *Bases divergem no MW publicado da Aligned/ODATA; use como ordem de grandeza.
        </p>
        <p className="body">
          126 operadores · 245 facilities · 1.576+ MW publicados no catálogo. Abaixo, os
          maiores por contagem de sites.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Operador</th>
                <th>Facilities</th>
                <th>MW publicados</th>
                <th>Live</th>
                <th>Pipeline</th>
                <th>Cidades</th>
              </tr>
            </thead>
            <tbody>
              {OPERATORS.map((o) => (
                <tr key={o.op}>
                  <td className="cell-name">{o.op}</td>
                  <td className="num">{o.fac}</td>
                  <td className="num">{o.mw}</td>
                  <td className="num">{o.live}</td>
                  <td className="num">{o.pipe}</td>
                  <td>{o.cidades}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="body">
          Há ainda dezenas de operadores regionais/edge (HostDime, Surfix, Ativas, bancos,
          SERPRO, DATAPREV, NIC.br, IX, ISPs estaduais). MW quase sempre não divulgados —
          listados no catálogo Coloprice, não repetidos aqui linha a linha para não inventar
          capacidade.
        </p>
      </section>

      <section id="redata" className="section">
        <h2>Redata, energia e a maior incerteza</h2>
        <div className="grid-2">
          <div className="panel">
            <h3>O que já é lei</h3>
            <p className="body">
              Redata (Lei 15.504/2026, sanção 15/09/2026): regime especial que suspende
              PIS/Cofins, IPI e, em condições, Imposto de Importação sobre equipamentos de
              datacenter. Habilitação pela Receita; regulamento e lista NBS ainda definem o
              ritmo prático. Contrapartidas: energia limpa, eficiência hídrica, P&D e cota
              doméstica mínima.
            </p>
          </div>
          <div className="panel">
            <h3>O gargalo real</h3>
            <p className="body">
              A EPE registrou mais de 56 GW em pedidos de acesso por data centers — ordem de
              magnitude acima dos 660 MW em obra. Uma parte não sairá do papel. Transmissão
              leva ~5 anos; um campus grande sobe em ~3. Em SP a EPE já recomendou ~R$ 1,6 bi
              em transmissão para liberar ~4 GW; há estudos para RJ (~4 GW), RS (até 5 GW
              Scala) e Nordeste (~4 GW).
            </p>
          </div>
        </div>
        <div className="callout danger">
          <strong>Maior incerteza.</strong> Separar anúncio de MW conectável e licenciado.
          TikTok já está em obra mas com LO judicializada; Scala AI City tem energia
          encaminhada e obra só em 2027; RT-One no PR/MG ainda sem licença ambiental. Somar
          pitches (até ~9+ GW nos cinco megaprojetos de IA) como se fossem capacidade certa
          distorce o mapa.
        </div>
      </section>

      <section id="fontes" className="section">
        <h2>Fontes principais</h2>
        <ol className="sources">
          {SOURCES.map((s, i) => (
            <li key={s.href}>
              <a href={s.href} target="_blank" rel="noopener noreferrer">
                <span className="src-num">{i + 1}</span>
                <span>
                  <strong>{s.title}</strong>
                  <em>
                    {s.site}
                    {s.date ? ` · ${s.date}` : ""}
                  </em>
                </span>
              </a>
            </li>
          ))}
        </ol>
        <hr />
        <p className="footer-note">
          Atualizado em 29/10/2026 (America/Sao_Paulo). Números sem fonte primaria marcados
          como não divulgado. Este é um dossiê de acompanhamento — não um censo regulatório
          oficial.
        </p>
      </section>
    </div>
  );
}

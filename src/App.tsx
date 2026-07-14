import {
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileAudio,
  FileSpreadsheet,
  Lightbulb,
  MapPinned,
  Mic2,
  Plus,
  Scale,
  Search,
  Settings2,
  Sparkles,
  Target,
  Upload,
  Workflow,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import * as XLSX from "xlsx";
import type {
  AppState,
  Capability,
  CompanyStatus,
  IntelligenceItem,
  NeedItem,
  NeedPriority,
  NeedStatus,
  PlanTarget,
  PolicyRecord,
  QuestionSet,
  QuestionTemplate,
  ResearchCompany,
  ResearchHypothesis,
  ResearchPlan,
  ResearchRecord,
  ResearchSample,
  ResearchTask,
  ResearchTopic,
  SamplingStrategy,
  Workspace
} from "./domain/types";
import { intelligenceBelongsToCompany, intelligenceIsRelevant } from "./domain/intelligence";
import { policyMatchesCompany } from "./domain/policy";
import { addLegacyPlanTargets, canCreateRecord, findFrozenQuestionSet, sampleCanBePlanned } from "./domain/research-workflow";
import { applyStateVersion, parseStoredState, STATE_VERSION } from "./state/persistence";

const STORE_KEY = "manufacturing-research-system:v1";
const YANLIANG_WORKSPACE_ID = "workspace-yanliang-aerospace";
const COLORS = ["#2563eb", "#14b8a6", "#f59e0b", "#ef4444", "#7c3aed", "#0f766e"];
const defaultWorkspaces: Workspace[] = [
  {
    id: YANLIANG_WORKSPACE_ID,
    name: "阎良航空制造产业",
    regionName: "西安市阎良区 / 西安航空基地",
    industryFocus: ["航空制造", "航空材料", "试验验证", "低空经济"],
    description: "以航空制造产业为主线，研究核心院所、链主企业、配套制造、政策导向与数字化共性诉求。",
    status: "试点中"
  }
];

const initialState: AppState = {
  dataVersion: STATE_VERSION,
  workspaces: defaultWorkspaces,
  activeWorkspaceId: YANLIANG_WORKSPACE_ID,
  topics: [],
  hypotheses: [],
  researchTasks: [],
  samplingStrategies: [],
  researchSamples: [],
  questionSets: [],
  planTargets: [],
  companies: [],
  plans: [],
  records: [],
  policies: defaultPolicyRecords(),
  intelligence: [],
  questionTemplates: defaultQuestionTemplates(),
  capabilities: [
    {
      id: uid(),
      name: "数字化诊断与蓝图规划",
      keywords: ["规划", "诊断", "路线图", "顶层设计", "蓝图"],
      description: "面向区域制造企业完成现状评估、差距分析、实施路线图与项目包设计。"
    },
    {
      id: uid(),
      name: "MES/MOM实施落地",
      keywords: ["MES", "生产", "派工", "报工", "工序", "车间"],
      description: "覆盖生产计划、工序执行、质量过程、设备采集和现场协同。"
    },
    {
      id: uid(),
      name: "质量追溯与数据治理",
      keywords: ["质量", "追溯", "批次", "检验", "数据治理"],
      description: "建立质量数据链路、批次追溯模型和指标治理机制。"
    },
    {
      id: uid(),
      name: "设备联网与工业数据采集",
      keywords: ["设备", "采集", "联网", "OEE", "PLC", "数据"],
      description: "对接设备、产线、传感器和工业协议，沉淀实时生产数据。"
    }
  ]
};

const yanliangCompanies: ResearchCompany[] = [
  yanliangCompany("航空工业第一飞机设计研究院（一飞院/603所）", "飞机总体设计/系统集成", "国家级科研设计单位", "研发设计/总体设计", "科研院所", 86, "公开资料显示，一飞院定址西安市阎良区，是集多类军民用飞机设计研究于一体的国家级大中型飞机设计研究院，承担总体设计、系统集成和主要性能/分系统验证性试验。"),
  yanliangCompany("中国飞行试验研究院（航空工业试飞中心/630所）", "飞行试验/适航鉴定", "国家级试飞鉴定机构", "试飞鉴定/适航验证", "科研院所", 84, "公开资料显示，试飞院位于西安市阎良区，创建于1959年，是我国航空产品国家级鉴定试飞机构，承担军民用飞机、航空发动机、机载设备等试飞鉴定。"),
  yanliangCompany("中国飞机强度研究所（强度所/623所）", "飞机强度研究与验证", "国家级强度验证机构", "试验验证/强度验证", "科研院所", 82, "公开资料显示，强度所在阎良国家航空产业基地设有军机科研/试验基地，是我国飞机结构强度研究、验证与鉴定的重要中心，承担静力、疲劳、环境适应性等试验验证。"),
  yanliangCompany("西安航空学院（阎良校区）", "航空人才培养/产教融合", "教学培训机构", "教学培训/人才供给", "高校院校", 62, "阎良区作为中国航空城的重要组成部分，教学培训是产业生态的一环；西安航空学院在阎良设有校区，与航空制造、维修、测试和人才培养紧密相关。"),
  yanliangCompany("长安先导航空宇航智能制造实验室", "航空宇航智能制造研发", "创新平台", "创新平台/智能制造实验室", "创新平台", 66, "报告提到长安先导航空宇航智能制造实验室入驻西工大多个团队，是区域航空智能制造创新平台。"),
  yanliangCompany("航空大数据中心", "航空数据服务/设备共享", "产业平台", "产业服务/数据平台", "产业平台", 64, "报告提到航空大数据中心设备共享率达80%，助企融资10亿元以上，是区域航空产业服务和数据平台节点。"),
  yanliangCompany("秦创原航空产业创新聚集区", "航空创新孵化/成果转化", "创新平台", "创新孵化/成果转化", "创新平台", 63, "报告提到秦创原航空产业创新聚集区于2024年获评，是阎良航空产业创新孵化和成果转化平台。"),
  yanliangCompany("中航西安飞机工业集团股份有限公司（中航西飞）", "航空整机制造", "链主企业", "整机总装/系统集成", "大型企业", 82, "报告将其定位为国内大型航空制造企业、大飞机总装集成商、C919链主企业，带动40余家本地供应商参与研制。"),
  yanliangCompany("西安飞机工业（集团）有限责任公司", "航空整机制造", "链主企业", "整机总装/系统集成", "大型企业", 78, "公开公告披露住所地为西安市阎良区西飞大道一号，创建于1958年，属航空工业核心制造主体。"),
  yanliangCompany("西飞民机有限公司", "民用飞机制造", "链主/核心企业", "整机总装/系统集成", "大型企业", 74, "民航西北局曾在阎良区航空制造产业基地重点调研西飞民机有限公司等单位。"),
  yanliangCompany("西安三角防务股份有限公司", "航空锻造/航空材料", "链主企业", "关键材料/大型锻件", "上市企业", 72, "报告将其定位为航空大型锻件制造企业，拥有12.5万吨多向模锻液压机，打造航空锻压聚集区。"),
  yanliangCompany("西安兴航航空科技股份有限公司", "航空结构件/智能装备", "链主企业", "结构件/智能工艺装备", "拟上市企业", 70, "报告称其为国产大飞机金属结构件主要供应商，研发五轴加工、自动钻铆等航空高端智能装备。"),
  yanliangCompany("西安钢研功能材料股份有限公司", "空天精密合金材料", "链主企业", "关键材料/精密合金", "拟上市企业", 68, "报告将其定位为空天用精密合金板材企业、航空新材料领域链主企业。"),
  yanliangCompany("西安鑫垚陶瓷基复合材料有限公司", "陶瓷基复合材料", "链主企业", "关键材料/复合材料", "重点企业", 68, "报告称其为全市重点产业链首批链主企业，陶瓷基复合材料制造园加快建设。"),
  yanliangCompany("西安百跃羊乳集团有限公司", "羊乳食品加工", "链主企业", "特色食品全产业链", "链主企业", 60, "报告称其集奶羊养殖、研发、生产于一体，是羊乳全产业链链主企业。"),
  yanliangCompany("西安驰达航空科技有限公司", "航空航天零部件", "重点企业", "零部件/大部件制造", "成长型企业", 58, "报告称其由零部件制造向整机/大部件升级，入围西安市低空经济重点企业。"),
  yanliangCompany("西安泽达航空制造有限责任公司", "航空装备/零件制造", "重点项目", "零部件/装备制造", "规模以上企业", 58, "报告称其为航空装备制造企业，2024年过亿元工业项目建成投产；公开报道提到年产飞机零件能力。"),
  yanliangCompany("西安博赛旋压科技有限公司", "航空金属旋压成形", "支柱企业", "关键工艺/成形制造", "支柱企业", 56, "报告称其为航空金属旋压成形技术行业支柱企业，获重点稳产扩产支持。"),
  yanliangCompany("西安嘉业航空科技有限公司", "航空零部件制造与配套", "支柱企业", "零部件/配套制造", "支柱企业", 55, "报告称其为航空零部件制造与配套企业，获重点稳产扩产支持。"),
  yanliangCompany("西安长之琳航空制造有限公司", "航空精密零部件", "入区企业", "零部件/精密加工", "入区企业", 48, "报告列为航空制造核心企业中的入区企业。"),
  yanliangCompany("安宇迪（西安）飞机工业有限公司", "飞机零部件制造", "入区企业", "零部件/精密加工", "入区企业", 50, "报告称其为2026年重点推进数字化转型企业。"),
  yanliangCompany("西安富瑞达科技发展有限公司", "航空科技制造", "入区企业", "航空科技/三首产品", "入区企业", 48, "报告称其为2026年重点支持打造三首产品企业。"),
  yanliangCompany("西安势加动力科技有限公司", "航空动力技术", "入区企业", "动力系统/动力部件", "入区企业", 49, "报告列为航空动力技术研发与制造企业。"),
  yanliangCompany("西安万钧航空动力科技有限公司", "航空动力制造", "入区企业", "动力系统/动力部件", "入区企业", 48, "报告列为航空动力相关制造企业。"),
  yanliangCompany("西安昌隆航空科技有限公司", "航空零部件加工", "入区企业", "零部件/精密加工", "入区企业", 46, "报告列为航空零部件加工与制造企业。"),
  yanliangCompany("西安嘉锐航空零部件加工有限责任公司", "航空零部件精密加工", "入区企业", "零部件/精密加工", "科技型中小企业", 46, "报告及科技型中小企业名单均涉及该企业。"),
  yanliangCompany("西安宏图航空制造有限责任公司", "航空结构件制造", "入区企业", "结构件/部段制造", "入区企业", 47, "报告列为航空结构件制造企业。"),
  yanliangCompany("西安奥若特材料技术有限公司", "航空管路/隔热降噪", "重点企业", "功能部件/材料应用", "成长型企业", 55, "公开报道提到其研发、生产、装配、试验飞机高低压管路、隔热降噪产品。"),
  yanliangCompany("陕西瑞格机械制造有限公司", "机械制造/航空配套", "配套企业", "零部件/配套制造", "成长型企业", 48, "陕西理工大学机械工程学院阎良访企拓岗公开信息提及走访该企业。"),
  yanliangCompany("西安市阎良区华航机械制造有限公司", "机械制造", "科技型中小企业", "零部件/配套制造", "科技型中小企业", 45, "陕西省科技型中小企业拟入库名单列明该企业位于西安市阎良区。"),
  yanliangCompany("西安顺风航空部附件制造有限公司", "航空部附件制造", "科技型中小企业", "功能部件/部附件", "科技型中小企业", 49, "陕西省科技型中小企业拟入库名单列明该企业位于西安市阎良区。"),
  yanliangCompany("西安市航空基地中汇航空科技有限公司", "航空科技/航空配套", "科技型中小企业", "零部件/配套制造", "科技型中小企业", 47, "陕西省科技型中小企业拟入库名单列明该企业位于西安市阎良区。"),
  yanliangCompany("陕西晟景精密机械制造有限公司", "精密机械制造", "科技型中小企业", "零部件/精密加工", "科技型中小企业", 44, "陕西省科技型中小企业拟入库名单列明该企业位于西安市阎良区。"),
  yanliangCompany("陕西华晨航空科技有限公司", "航空科技/航空配套", "科技型中小企业", "零部件/配套制造", "科技型中小企业", 43, "陕西省科技型中小企业拟入库名单列明该企业位于西安市阎良区。"),
  yanliangCompany("西安坤园航空科技有限公司", "航空科技/航空配套", "科技型中小企业", "零部件/配套制造", "科技型中小企业", 42, "陕西省科技型中小企业拟入库名单列明该企业位于西安市阎良区。"),
  yanliangCompany("陕西浩瑞诺机械有限责任公司", "机械制造", "科技型中小企业", "零部件/配套制造", "科技型中小企业", 41, "陕西省科技型中小企业拟入库名单列明该企业位于西安市阎良区。"),
  yanliangCompany("西安沧海航空科技有限公司", "航空科技/航空配套", "科技型中小企业", "零部件/配套制造", "科技型中小企业", 42, "陕西省科技型中小企业拟入库名单列明该企业位于西安市阎良区。"),
  yanliangCompany("锐达恩特（西安）航空制造有限公司", "航空制造", "科技型中小企业", "零部件/配套制造", "科技型中小企业", 46, "陕西省科技型中小企业拟入库名单列明该企业位于西安市阎良区。"),
  yanliangCompany("陕西融达铝合金新材料有限公司", "铝合金新材料", "科技型中小企业", "关键材料/铝合金", "科技型中小企业", 43, "陕西省科技型中小企业拟入库名单列明该企业位于西安市阎良区。"),
  yanliangCompany("西安四方超轻材料有限公司", "超轻材料/航空材料", "重点企业", "关键材料/轻量化材料", "园区企业", 45, "报告称其为超轻金属材料企业，2026年重点帮扶开展技术攻关。"),
  yanliangCompany("西安宇钛航空科技发展有限公司", "航空科技/钛合金配套", "科技型中小企业", "关键材料/钛合金", "科技型中小企业", 42, "陕西省科技型中小企业拟入库名单列明该企业位于西安市阎良区。"),
  yanliangCompany("中铁长安重工有限公司", "重型装备制造", "支柱企业", "专用设备/重型装备", "支柱企业", 54, "报告称其重型电动自卸车等工程机械2024年正式量产，2025年拓展海外市场。"),
  yanliangCompany("陕西无人装备科技有限公司", "无人装备/无人机", "重点企业", "低空经济/无人机", "重点企业", 52, "报告称其为无人装备/无人机研发制造企业，获关键技术攻关支持。"),
  yanliangCompany("宇立航空", "无人机/航空装备", "重点企业", "低空经济/无人机", "重点企业", 50, "报告称其2026年力促投产达效。"),
  yanliangCompany("黄河新兴（黄河集团无人机感知）", "无人机感知系统", "重点企业", "低空经济/感知系统", "新三板企业", 52, "报告称其无人机感知系统产业园落地建设，2024年挂牌新三板。"),
  yanliangCompany("富沃德", "无人机整机制造", "重点企业", "低空经济/无人机整机", "重点企业", 50, "报告称其2026年支持整机批产上量。"),
  yanliangCompany("陕西金宇航空科技有限公司", "航空维修/航材保障", "成长型企业", "航材保障/维修制造", "成长型企业", 47, "公开信息提及航空器材保障、维修制造等业务。"),
  yanliangCompany("西安市航空基地天翼航空科技有限公司", "无人机研发制造", "成长型企业", "低空经济/无人机", "成长型企业", 50, "公开资料称其主营无人机新技术开发、推广、应用、制造、销售。"),
  yanliangCompany("西安鑫旺矿业设备有限公司", "矿业设备再制造", "成长型企业", "专用设备/再制造", "成长型企业", 45, "公开招聘信息称其从事液压千斤制造与维修、液压缸制造、综采支架维修等。")
];

export function App() {
  const [state, setState, syncStatus] = useServerState();
  const [active, setActive] = useState("workspace");
  const [selectedCompanyId, setSelectedCompanyId] = useState(state.companies[0]?.id ?? "");
  const [profileCompanyId, setProfileCompanyId] = useState<string | null>(null);
  const insights = useMemo(() => buildInsights(state), [state]);
  const activeWorkspace = state.workspaces.find((workspace) => workspace.id === state.activeWorkspaceId) ?? state.workspaces[0];
  const profileCompany = state.companies.find((company) => company.id === profileCompanyId);

  function updateState(next: AppState) {
    setState(next);
    if (!next.companies.some((company) => company.id === selectedCompanyId)) {
      setSelectedCompanyId(next.companies[0]?.id ?? "");
    }
  }

  function openCompanyProfile(companyId: string) {
    setSelectedCompanyId(companyId);
    setProfileCompanyId(companyId);
  }

  function saveProfileCompany(company: ResearchCompany) {
    updateState({
      ...state,
      companies: state.companies.map((item) => item.id === company.id ? company : item)
    });
    setSelectedCompanyId(company.id);
    setProfileCompanyId(company.id);
  }

  if (syncStatus === "loading") {
    return <main className="app-loading"><strong>正在连接调研数据服务...</strong><span>首次运行会将本机已有调研数据迁移到服务端数据库。</span></main>;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><BarChart3 size={22} /></span>
          <div>
            <strong>区域调研</strong>
            <small>Manufacturing Research</small>
          </div>
        </div>
        <nav aria-label="主导航">
          <NavGroup label="区域工作台">
            <NavItem icon={<MapPinned size={18} />} label="区域驾驶舱" active={active === "workspace"} onClick={() => setActive("workspace")} />
          </NavGroup>
          <NavGroup label="区域认知">
            <NavItem icon={<Workflow size={18} />} label="产业全景" active={active === "chain"} onClick={() => setActive("chain")} />
            <NavItem icon={<Building2 size={18} />} label="企业库" active={active === "companies"} onClick={() => setActive("companies")} />
            <NavItem icon={<Search size={18} />} label="动态情报" active={active === "intelligence"} onClick={() => setActive("intelligence")} />
            <NavItem icon={<Scale size={18} />} label="政策库与匹配" active={active === "policies"} onClick={() => setActive("policies")} />
          </NavGroup>
          <NavGroup label="调研工作">
            <NavItem icon={<Target size={18} />} label="调研项目" active={active === "projects"} onClick={() => setActive("projects")} />
            <NavItem icon={<Building2 size={18} />} label="调研对象" active={active === "objects"} onClick={() => setActive("objects")} />
            <NavItem icon={<ClipboardList size={18} />} label="访谈提纲" active={active === "questions"} onClick={() => setActive("questions")} />
            <NavItem icon={<CalendarDays size={18} />} label="调研计划" active={active === "plans"} onClick={() => setActive("plans")} />
            <NavItem icon={<Mic2 size={18} />} label="调研执行" active={active === "records"} onClick={() => setActive("records")} />
            <NavItem icon={<Search size={18} />} label="调研记录库" active={active === "archives"} onClick={() => setActive("archives")} />
          </NavGroup>
          <NavGroup label="分析洞察">
            <NavItem icon={<Target size={18} />} label="研究专题" active={active === "research"} onClick={() => setActive("research")} />
            <NavItem icon={<BarChart3 size={18} />} label="需求洞察" active={active === "needs"} onClick={() => setActive("needs")} />
          </NavGroup>
          <NavGroup label="决策与资产">
            <NavItem icon={<Lightbulb size={18} />} label="决策中心" active={active === "advice"} onClick={() => setActive("advice")} />
            <NavItem icon={<Settings2 size={18} />} label="知识资产" active={active === "knowledge"} onClick={() => setActive("knowledge")} />
            <NavItem icon={<ClipboardList size={18} />} label="问题库" active={active === "question-library"} onClick={() => setActive("question-library")} />
          </NavGroup>
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>区域产业调研与机会决策系统</h1>
            <p>从区域认知出发，完成调研、洞察与市场、销售、研发决策闭环。</p>
          </div>
          <div className="topbar-context">
            {syncStatus === "error" ? <span className="sync-warning">数据服务暂不可用，当前修改尚未保存到服务端。</span> : null}
            {activeWorkspace ? <div className="workspace-context"><MapPinned size={17} /><div><strong>{activeWorkspace.name}</strong><span>{activeWorkspace.regionName} / {activeWorkspace.status}</span></div></div> : null}
          </div>
        </header>

        {active === "workspace" && activeWorkspace ? <WorkspaceOverview workspace={activeWorkspace} state={state} insights={insights} /> : null}
        {active === "research" && activeWorkspace ? <IndustryResearch state={state} setState={updateState} workspace={activeWorkspace} /> : null}
        {active === "companies" ? <Companies state={state} setState={updateState} selectedCompanyId={selectedCompanyId} setSelectedCompanyId={setSelectedCompanyId} openCompanyProfile={openCompanyProfile} /> : null}
        {active === "intelligence" ? <IntelligenceCenter state={state} setState={updateState} openCompanyProfile={openCompanyProfile} /> : null}
        {active === "chain" ? <IndustryChainMap state={state} openCompanyProfile={openCompanyProfile} /> : null}
        {active === "projects" ? <ResearchTasks mode="project" state={state} setState={updateState} /> : null}
        {active === "objects" ? <ResearchTasks mode="object" state={state} setState={updateState} /> : null}
        {active === "questions" ? <QuestionGenerator state={state} setState={updateState} selectedCompanyId={selectedCompanyId} setSelectedCompanyId={setSelectedCompanyId} /> : null}
        {active === "policies" ? <PolicyMatch state={state} setState={updateState} /> : null}
        {active === "plans" ? <Plans state={state} setState={updateState} /> : null}
        {active === "records" ? <Records state={state} setState={updateState} selectedCompanyId={selectedCompanyId} /> : null}
        {active === "archives" ? <ResearchArchive state={state} /> : null}
        {active === "needs" ? <Needs state={state} setState={updateState} /> : null}
        {active === "advice" ? <Advice state={state} insights={insights} /> : null}
        {active === "knowledge" ? <KnowledgeAssets state={state} /> : null}
        {active === "question-library" ? <QuestionLibrary state={state} setState={updateState} /> : null}
      </main>

      {profileCompany ? (
        <CompanyProfileDrawer
          key={profileCompany.id}
          company={profileCompany}
          policies={state.policies.filter((policy) => policyMatchesCompany(policy, profileCompany))}
          intelligence={state.intelligence.filter((item) => intelligenceBelongsToCompany(item, profileCompany.id))}
          questionSets={state.questionSets.filter((item) => item.companyId === profileCompany.id)}
          records={state.records.filter((item) => item.companyId === profileCompany.id)}
          planTargets={state.planTargets.filter((item) => item.companyId === profileCompany.id)}
          plans={state.plans}
          onClose={() => setProfileCompanyId(null)}
          onSave={saveProfileCompany}
        />
      ) : null}
    </div>
  );
}

function WorkspaceOverview({ workspace, state, insights }: { workspace: Workspace; state: AppState; insights: ReturnType<typeof buildInsights> }) {
  const workspaceCompanies = state.companies.filter((company) => company.workspaceId === workspace.id);
  const workspacePlans = state.plans.filter((plan) => plan.workspaceId === workspace.id);
  const workspaceRecords = state.records.filter((record) => record.workspaceId === workspace.id);
  const completedRecords = workspaceRecords.filter((record) => record.conclusion || record.needs.length).length;
  return (
    <div className="page-grid">
      <section className="workspace-hero">
        <div>
          <span className="workspace-eyebrow">区域工作空间 / 当前试点</span>
          <h2>{workspace.name}</h2>
          <p>{workspace.description}</p>
          <div className="workspace-tags">{workspace.industryFocus.map((item) => <span key={item}>{item}</span>)}</div>
        </div>
        <div className="workspace-hero-meta">
          <strong>{workspace.status}</strong>
          <span>{workspace.regionName}</span>
          <small>首期以单区域闭环验证；企业、计划和记录已具备区域归属，为后续多区域扩展预留数据边界。</small>
        </div>
      </section>
      <section className="metric-grid">
        <Metric icon={<Building2 />} label="区域企业" value={workspaceCompanies.length} />
        <Metric icon={<CalendarDays />} label="调研计划" value={workspacePlans.length} />
        <Metric icon={<Mic2 />} label="已沉淀记录" value={completedRecords} />
        <Metric icon={<Target />} label="结构化需求" value={insights.needs.length} />
      </section>
      <section className="grid two">
        <Panel title="本区域研究主线">
          <div className="workspace-list">
            <div><strong>产业运行</strong><span>围绕设计、制造、强度验证、试飞适航及配套协同，持续更新产业结构与核心节点关系。</span></div>
            <div><strong>企业调研</strong><span>通过企业角色、调研假设、动态情报和访谈证据生成适合本次调研的任务包。</span></div>
            <div><strong>决策输出</strong><span>归纳共性问题、政策杠杆和市场主题，支撑销售进入、研发方向和生态合作决策。</span></div>
          </div>
        </Panel>
        <Panel title="多区域扩展准备">
          <div className="workspace-list">
            <div><strong>区域数据边界</strong><span>企业、计划和记录都绑定工作空间；后续新增区域不会混淆原始调研数据。</span></div>
            <div><strong>平台知识共享</strong><span>能力库、案例库、调研问题模板和行业模型将逐步升级为可跨区域复用的资产。</span></div>
            <div><strong>横向比较</strong><span>未来可比较不同区域同类企业的需求热度、政策环境和市场进入路径。</span></div>
          </div>
        </Panel>
      </section>
      <Dashboard state={state} insights={insights} showMetrics={false} />
    </div>
  );
}

function IndustryResearch({ state, setState, workspace }: { state: AppState; setState: (state: AppState) => void; workspace: Workspace }) {
  const topics = (state.topics ?? []).filter((topic) => topic.workspaceId === workspace.id);
  const [selectedTopicId, setSelectedTopicId] = useState(topics[0]?.id ?? "");
  const [topicDraft, setTopicDraft] = useState({ name: "", description: "", tags: "" });
  const [hypothesisDraft, setHypothesisDraft] = useState({ statement: "", evidence: "" });
  const selectedTopic = topics.find((topic) => topic.id === selectedTopicId) ?? topics[0];
  const hypotheses = (state.hypotheses ?? []).filter((hypothesis) => hypothesis.workspaceId === workspace.id && hypothesis.topicId === selectedTopic?.id);

  function addTopic() {
    if (!topicDraft.name.trim()) return;
    const topic: ResearchTopic = {
      id: uid(),
      workspaceId: workspace.id,
      name: topicDraft.name.trim(),
      description: topicDraft.description.trim() || "待补充研究范围与调研目的。",
      tags: splitTags(topicDraft.tags),
      status: "待验证"
    };
    setState({ ...state, topics: [...(state.topics ?? []), topic] });
    setSelectedTopicId(topic.id);
    setTopicDraft({ name: "", description: "", tags: "" });
  }

  function addHypothesis() {
    if (!selectedTopic || !hypothesisDraft.statement.trim()) return;
    const hypothesis: ResearchHypothesis = {
      id: uid(),
      workspaceId: workspace.id,
      topicId: selectedTopic.id,
      statement: hypothesisDraft.statement.trim(),
      evidence: hypothesisDraft.evidence.trim() || "尚无证据，需通过企业访谈、公开情报或政策材料验证。",
      status: "待验证"
    };
    setState({ ...state, hypotheses: [...(state.hypotheses ?? []), hypothesis] });
    setHypothesisDraft({ statement: "", evidence: "" });
  }

  function deleteTopic() {
    if (!selectedTopic) return;
    if (!window.confirm(`删除专题“${selectedTopic.name}”？该操作会移除其关联假设和项目关联。`)) return;
    const nextTopics = state.topics.filter((topic) => topic.id !== selectedTopic.id);
    setState({
      ...state,
      topics: nextTopics,
      hypotheses: state.hypotheses.filter((hypothesis) => hypothesis.topicId !== selectedTopic.id),
      researchTasks: state.researchTasks.map((task) => ({ ...task, topicIds: task.topicIds.filter((topicId) => topicId !== selectedTopic.id) })),
      intelligence: state.intelligence.map((item) => ({ ...item, topicIds: item.topicIds.filter((topicId) => topicId !== selectedTopic.id) }))
    });
    setSelectedTopicId(nextTopics.find((topic) => topic.workspaceId === workspace.id)?.id ?? "");
  }

  return (
    <div className="page-grid">
      <section className="research-banner">
        <div><span>产业研究工作台</span><h2>先形成假设，再用企业调研和外部信息验证</h2><p>专题组织跨企业研究，假设明确本轮调研要验证什么；需求、录音、政策和招投标等后续都将作为证据回写。</p></div>
      </section>
      <section className="grid two">
        <Panel title="产业研究专题" action={selectedTopic ? <button className="button danger" type="button" onClick={deleteTopic}>删除专题</button> : undefined}>
          <div className="topic-list">
            {topics.map((topic) => (
              <button className={`topic-card ${topic.id === selectedTopic?.id ? "active" : ""}`} type="button" key={topic.id} onClick={() => setSelectedTopicId(topic.id)}>
                <div><strong>{topic.name}</strong><em>{topic.status}</em></div>
                <p>{topic.description}</p>
                <span>{topic.tags.join(" / ") || "未标注标签"}</span>
              </button>
            ))}
          </div>
          <div className="topic-form">
            <Field label="新专题名称" value={topicDraft.name} onChange={(name) => setTopicDraft({ ...topicDraft, name })} />
            <Field label="标签" value={topicDraft.tags} onChange={(tags) => setTopicDraft({ ...topicDraft, tags })} />
            <label>研究范围<textarea value={topicDraft.description} onChange={(event) => setTopicDraft({ ...topicDraft, description: event.target.value })} /></label>
            <button className="button secondary" type="button" onClick={addTopic}><Plus size={16} /> 新建专题</button>
          </div>
        </Panel>
        <Panel title={selectedTopic ? `${selectedTopic.name}：调研假设` : "调研假设"}>
          {selectedTopic ? (
            <>
              <div className="hypothesis-list">
                {hypotheses.map((hypothesis) => (
                  <div className="hypothesis-card" key={hypothesis.id}>
                    <div><strong>{hypothesis.statement}</strong><em className={hypothesis.status}>{hypothesis.status}</em></div>
                    <p>{hypothesis.evidence}</p>
                  </div>
                ))}
              </div>
              <div className="topic-form">
                <label>待验证判断<textarea value={hypothesisDraft.statement} onChange={(event) => setHypothesisDraft({ ...hypothesisDraft, statement: event.target.value })} placeholder="例如：关键零部件企业的共性矛盾主要在质量证据链与交付协同，而非单纯设备自动化。" /></label>
                <label>已有线索或验证方式<textarea value={hypothesisDraft.evidence} onChange={(event) => setHypothesisDraft({ ...hypothesisDraft, evidence: event.target.value })} placeholder="记录公开资料、政策方向、已知访谈线索，或写明下一步要访谈哪些企业验证。" /></label>
                <button className="button" type="button" onClick={addHypothesis}><Target size={16} /> 加入待验证假设</button>
              </div>
            </>
          ) : <div className="empty-stage">请先创建产业研究专题。</div>}
        </Panel>
      </section>
    </div>
  );
}

function Dashboard({ state, insights, showMetrics = true }: { state: AppState; insights: ReturnType<typeof buildInsights>; showMetrics?: boolean }) {
  return (
    <div className="page-grid">
      {showMetrics ? <section className="metric-grid">
        <Metric icon={<Building2 />} label="企业数" value={state.companies.length} />
        <Metric icon={<CalendarDays />} label="计划数" value={state.plans.length} />
        <Metric icon={<Mic2 />} label="记录数" value={state.records.length} />
        <Metric icon={<Target />} label="需求数" value={insights.needs.length} />
      </section> : null}
      <section className="grid two">
        <ChartCard title="行业分布">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={insights.industryData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {insights.industryData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="调研状态">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={insights.statusData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
                {insights.statusData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>
      <section className="grid two">
        <ChartCard title="企业类型分布">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={insights.companyTypeData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#14b8a6" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="产业链位置分布">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={insights.chainPositionData} layout="vertical" margin={{ left: 28 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="name" type="category" width={116} />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>
      <section className="grid two">
        <Panel title="共通需求 Top">
          <div className="rank-list">
            {insights.categoryData.map((item) => (
              <div className="rank-row" key={item.name}>
                <span>{item.name}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="能力匹配概览">
          <div className="capability-list">
            {insights.capabilityHits.map((item) => (
              <div className="capability-row" key={item.name}>
                <CheckCircle2 size={18} />
                <span>{item.name}</span>
                <strong>{item.value} 条需求</strong>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="产业链共通需求判断">
          <div className="advice-list">
            {insights.chainSuggestions.map((item) => <div className="advice" key={item}><Target size={18} /><span>{item}</span></div>)}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function Companies({ state, setState, selectedCompanyId, setSelectedCompanyId, openCompanyProfile }: { state: AppState; setState: (state: AppState) => void; selectedCompanyId: string; setSelectedCompanyId: (id: string) => void; openCompanyProfile: (id: string) => void }) {
  const [keyword, setKeyword] = useState("");
  const [drawerMode, setDrawerMode] = useState<"create" | "edit" | null>(null);
  const [editingCompany, setEditingCompany] = useState<ResearchCompany>(emptyCompany());
  const filtered = state.companies.filter((company) => [company.name, company.region, company.industry, company.companyType, company.chainPosition, company.notes].join(" ").includes(keyword));

  async function importExcel(file: File) {
    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(bytes);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    const imported = rows.map((row) => ({
      id: uid(),
      workspaceId: state.activeWorkspaceId,
      name: stringCell(row, ["企业名称", "公司名称", "name", "Name"]) || "未命名企业",
      region: stringCell(row, ["区域", "地区", "region"]) || "",
      industry: stringCell(row, ["行业", "industry"]) || "",
      companyType: stringCell(row, ["企业类型", "类型", "companyType"]) || "",
      chainPosition: stringCell(row, ["产业链位置", "链条位置", "chainPosition"]) || "",
      scale: stringCell(row, ["规模", "人员规模", "scale"]) || "",
      contact: stringCell(row, ["联系人", "联系方式", "contact"]) || "",
      status: "待调研" as CompanyStatus,
      maturity: Number(stringCell(row, ["数字化成熟度", "成熟度", "maturity"]) || 30),
      notes: stringCell(row, ["备注", "notes"]) || ""
    }));
    setState({ ...state, companies: [...state.companies, ...imported] });
  }

  function openCreate() {
    setEditingCompany(emptyCompany());
    setDrawerMode("create");
  }

  function openDetail(company: ResearchCompany) {
    setSelectedCompanyId(company.id);
    openCompanyProfile(company.id);
  }

  function openEdit(company: ResearchCompany) {
    setEditingCompany(company);
    setDrawerMode("edit");
  }

  function saveCompany() {
    if (!editingCompany.name.trim()) return;
    if (drawerMode === "edit") {
      setState({
        ...state,
        companies: state.companies.map((company) => company.id === editingCompany.id ? editingCompany : company)
      });
      setSelectedCompanyId(editingCompany.id);
    } else {
      const created = { ...editingCompany, id: uid(), region: editingCompany.region || "西安市阎良区 / 西安航空基地" };
      setState({ ...state, companies: [...state.companies, created] });
      setSelectedCompanyId(created.id);
    }
    setDrawerMode(null);
  }

  return (
    <div className="grid">
      <Panel
        title="企业名单"
        action={
          <div className="panel-actions">
            <label className="file-button"><FileSpreadsheet size={16} /> Excel导入<input type="file" accept=".xlsx,.xls,.csv" onChange={(event) => event.target.files?.[0] && importExcel(event.target.files[0])} /></label>
            <button className="button" type="button" onClick={openCreate}><Plus size={16} /> 新增企业</button>
          </div>
        }
      >
        <div className="toolbar">
          <div className="search-box"><Search size={17} /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索企业、区域、行业" /></div>
        </div>
        <div className="company-table">
          {filtered.map((company) => (
            <button className={`company-row ${company.id === selectedCompanyId ? "active" : ""}`} key={company.id} onClick={() => openDetail(company)}>
              <strong>{company.name}</strong>
              <span>{company.region || "-"} / {company.industry || "-"} / {company.companyType || "-"} / {company.chainPosition || "-"}</span>
              <em>{company.status}</em>
            </button>
          ))}
        </div>
      </Panel>

      {drawerMode ? (
        <div className="drawer-layer" onMouseDown={() => setDrawerMode(null)}>
          <aside className="drawer" onMouseDown={(event) => event.stopPropagation()}>
            <div className="drawer-head">
              <div>
                <h2>{drawerMode === "create" ? "新增企业" : "编辑企业"}</h2>
                <p>{editingCompany.name || "阎良区制造业企业"}</p>
              </div>
              <button className="icon-button" type="button" onClick={() => setDrawerMode(null)}><X size={18} /></button>
            </div>
            <CompanyEditor company={editingCompany} setCompany={setEditingCompany} onSave={saveCompany} />
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function CompanyProfileDrawer({ company, policies, intelligence, questionSets, records, planTargets, plans, onClose, onSave }: { company: ResearchCompany; policies: PolicyRecord[]; intelligence: IntelligenceItem[]; questionSets: QuestionSet[]; records: ResearchRecord[]; planTargets: PlanTarget[]; plans: ResearchPlan[]; onClose: () => void; onSave: (company: ResearchCompany) => void }) {
  const [mode, setMode] = useState<"detail" | "edit">("detail");
  const [draft, setDraft] = useState(company);

  function save() {
    if (!draft.name.trim()) return;
    onSave(draft);
    setMode("detail");
  }

  return (
    <div className="drawer-layer" onMouseDown={onClose}>
      <aside className="drawer" onMouseDown={(event) => event.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <h2>{mode === "edit" ? "编辑企业" : "企业详情"}</h2>
            <p>{company.name}</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose}><X size={18} /></button>
        </div>
        {mode === "detail" ? (
          <CompanyDetail company={company} policies={policies} intelligence={intelligence} questionSets={questionSets} records={records} planTargets={planTargets} plans={plans} onEdit={() => {
            setDraft(company);
            setMode("edit");
          }} />
        ) : (
          <CompanyEditor company={draft} setCompany={setDraft} onSave={save} />
        )}
      </aside>
    </div>
  );
}

function CompanyDetail({ company, policies, intelligence, questionSets, records, planTargets, plans, onEdit }: { company: ResearchCompany; policies: PolicyRecord[]; intelligence: IntelligenceItem[]; questionSets: QuestionSet[]; records: ResearchRecord[]; planTargets: PlanTarget[]; plans: ResearchPlan[]; onEdit: () => void }) {
  return (
    <div className="drawer-content">
      <div className="detail-grid">
        <DetailItem label="区域" value={company.region} />
        <DetailItem label="行业" value={company.industry} />
        <DetailItem label="企业类型" value={company.companyType} />
        <DetailItem label="产业链位置" value={company.chainPosition} />
        <DetailItem label="规模" value={company.scale} />
        <DetailItem label="调研状态" value={company.status} />
        <DetailItem label="联系人" value={company.contact} />
        <DetailItem label="成熟度" value={`${company.maturity}`} />
      </div>
      <section className="detail-section">
        <h3>企业说明</h3>
        <p>{company.notes || "暂无补充信息。"}</p>
      </section>
      <section className="detail-section">
        <h3>产业调研关注点</h3>
        <ul>
          {recommendedFocus(company).map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
      <section className="detail-section">
        <h3>外部动态与待验证线索</h3>
        <div className="tender-list">
          {intelligence.map((item) => (
            <div className="tender-card" key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <span>{item.type} / {item.publishedAt || "发布日期待补充"} / {item.verificationStatus}</span>
              </div>
              <p>{item.summary || "暂无摘要。"}</p>
              {item.sourceUrl ? <a className="source-link" href={item.sourceUrl} target="_blank" rel="noreferrer">查看来源</a> : <span className="muted-text">来源链接待补充</span>}
            </div>
          ))}
          {!intelligence.length ? <div className="empty-stage">尚无已录入动态。请在“动态情报”中新增或导入线索后，再用于调研准备和企业判断。</div> : null}
        </div>
      </section>
      <section className="detail-section">
        <h3>适配政府补贴政策</h3>
        <div className="policy-mini-list">
          {policies.map((policy) => (
            <div className="policy-mini-card" key={policy.id}>
              <div>
                <strong>{policy.name}</strong>
                <span>{policy.level} / {policy.amount}</span>
              </div>
              <p>{policy.decisionValue}</p>
              <div className="policy-tags">
                {policy.serviceMatches.map((item) => <span key={item}>{item}</span>)}
              </div>
            </div>
          ))}
          {!policies.length ? <p>暂无自动匹配政策，建议补充企业类型、产业链位置后重新判断。</p> : null}
        </div>
      </section>
      <section className="detail-section">
        <h3>调研历史</h3>
        <div className="tender-list">
          {planTargets.map((target) => {
            const plan = plans.find((item) => item.id === target.planId);
            const questionSet = questionSets.find((item) => item.id === target.questionSetId);
            const record = records.find((item) => item.planTargetId === target.id);
            return <div className="tender-card" key={target.id}>
              <div>
                <strong>{target.scheduledAt} / {target.status}</strong>
                <span>{plan?.objective || "调研目标待补充"} / {target.method || "方式待补充"}</span>
              </div>
              <p>{questionSet ? `问题组：${questionSet.name}` : `问题 ${target.questionSnapshot.length} 条`} {record ? `；已形成 ${record.needs.length} 条需求候选` : "；尚未形成记录"}</p>
            </div>;
          })}
          {!planTargets.length ? <div className="empty-stage">该企业尚未纳入调研计划。</div> : null}
        </div>
      </section>
      <button className="button" type="button" onClick={onEdit}>编辑企业</button>
    </div>
  );
}

function CompanyEditor({ company, setCompany, onSave }: { company: ResearchCompany; setCompany: (company: ResearchCompany) => void; onSave: () => void }) {
  return (
    <div className="drawer-content">
      <div className="form-grid">
        <Field label="企业名称" value={company.name} onChange={(name) => setCompany({ ...company, name })} />
        <Field label="调研区域" value={company.region} onChange={(region) => setCompany({ ...company, region })} />
        <Field label="行业" value={company.industry} onChange={(industry) => setCompany({ ...company, industry })} />
        <Field label="企业类型" value={company.companyType} onChange={(companyType) => setCompany({ ...company, companyType })} />
        <Field label="产业链位置" value={company.chainPosition} onChange={(chainPosition) => setCompany({ ...company, chainPosition })} />
        <Field label="企业规模" value={company.scale} onChange={(scale) => setCompany({ ...company, scale })} />
        <Field label="联系人" value={company.contact} onChange={(contact) => setCompany({ ...company, contact })} />
        <label>调研状态<select value={company.status} onChange={(event) => setCompany({ ...company, status: event.target.value as CompanyStatus })}><option>待调研</option><option>已预约</option><option>调研中</option><option>已完成</option></select></label>
      </div>
      <label>备注<textarea value={company.notes} onChange={(event) => setCompany({ ...company, notes: event.target.value })} /></label>
      <button className="button" type="button" onClick={onSave}><CheckCircle2 size={16} /> 保存</button>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return <div className="detail-item"><span>{label}</span><strong>{value || "-"}</strong></div>;
}

function IndustryChainMap({ state, openCompanyProfile }: { state: AppState; openCompanyProfile: (id: string) => void }) {
  const stages = buildChainStages(state.companies);
  const coreRelations = buildCoreRelations(state.companies);
  const [mode, setMode] = useState<"classification" | "network">("classification");
  return (
    <div className="page-grid chain-page">
      <section className="panel chain-workspace">
        <div className="panel-head chain-workspace-head">
          <div>
            <h2>航空制造产业链地图</h2>
            <p>{mode === "classification" ? "按产业环节梳理阎良区企业分布，适合识别共通需求和样板企业。" : "围绕一飞院、西飞、试飞院、强度所观察设计、制造、验证、试飞之间的协同关系。"}</p>
          </div>
          <div className="mode-switch" role="tablist" aria-label="产业链地图模式">
            <button className={mode === "classification" ? "active" : ""} type="button" onClick={() => setMode("classification")}>产业分类视图</button>
            <button className={mode === "network" ? "active" : ""} type="button" onClick={() => setMode("network")}>核心节点协同网络</button>
          </div>
        </div>

        {mode === "classification" ? (
          <div className="chain-map expanded">
            {stages.map((stage, index) => (
              <div className="chain-stage" key={stage.name}>
                <div className="chain-stage-head">
                  <span>{index + 1}</span>
                  <div>
                    <strong>{stage.name}</strong>
                    <small>{stage.description}</small>
                  </div>
                  <em>{stage.companies.length} 个节点</em>
                </div>
                <div className="chain-companies">
                  {stage.companies.map((company) => (
                    <button
                      className={`chain-company ${company.companyType.includes("链主") ? "leader" : ""}`}
                      key={company.id}
                      type="button"
                      onClick={() => openCompanyProfile(company.id)}
                    >
                      <strong>{company.name}</strong>
                      <span>{company.companyType}</span>
                      <small>{company.chainPosition}</small>
                    </button>
                  ))}
                  {!stage.companies.length ? <div className="empty-stage">暂无企业</div> : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="network-board">
            {coreRelations.map((core) => (
              <div className="network-core-card" key={core.name}>
                <div className="network-core-head">
                  <div>
                    <strong>{core.name}</strong>
                    <span>{core.role}</span>
                  </div>
                </div>
                <div className="network-relations">
                  {core.relations.map((relation) => {
                    const visibleTargets = relation.targets.slice(0, 9);
                    const rest = relation.targets.length - visibleTargets.length;
                    return (
                      <div className="network-relation" key={`${core.name}-${relation.label}`}>
                        <div className="network-relation-head">
                          <strong>{relation.label}</strong>
                          <span>{relation.targets.length} 个节点</span>
                        </div>
                        <div className="network-targets">
                          {visibleTargets.map((target) => <button type="button" key={target.id} onClick={() => openCompanyProfile(target.id)}>{target.name}</button>)}
                          {rest > 0 ? <em>+{rest}</em> : null}
                          {!relation.targets.length ? <span>暂无匹配节点</span> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="grid two">
        <Panel title="链主-配套观察">
          <div className="advice-list">
            <div className="advice"><Workflow size={18} /><span>链主企业负责定义质量标准、供应商协同节奏和产业链数据口径，是区域数字化需求的上游牵引。</span></div>
            <div className="advice"><Workflow size={18} /><span>配套制造企业更多受订单、交付、质量追溯和设备效率约束，适合以轻量MES、设备采集和质量数据治理切入。</span></div>
            <div className="advice"><Workflow size={18} /><span>材料和特种工艺企业对研发试制、批次一致性、检验数据和认证资料管理更敏感，应独立设计调研问题。</span></div>
          </div>
        </Panel>
        <Panel title="招标信息接入建议">
          <div className="advice-list">
            <div className="advice"><Search size={18} /><span>企业详情后续增加“招标/采购信息”页签，按企业名、产业关键词和数字化关键词手动更新。</span></div>
            <div className="advice"><CalendarDays size={18} /><span>定期更新建议从每周一次开始，保存来源、发布时间、标题、关键词和是否数字化相关。</span></div>
            <div className="advice"><Sparkles size={18} /><span>招标线索命中MES、工业互联网、质量追溯、设备采购时，自动追加到该企业调研问题中。</span></div>
          </div>
        </Panel>
      </section>
    </div>
  );
}

function PolicyMatch({ state, setState }: { state: AppState; setState: (state: AppState) => void }) {
  const [draft, setDraft] = useState<PolicyRecord>(() => state.policies[0] ?? emptyPolicy());
  const matches = state.policies.map((policy) => ({
    policy,
    companies: state.companies.filter((company) => policyMatchesCompany(policy, company))
  }));

  function selectPolicy(policy: PolicyRecord) {
    setDraft(policy);
  }

  function savePolicy() {
    if (!draft.name.trim()) return;
    const updated = { ...draft, id: draft.id || uid(), version: draft.version || 1, lastUpdatedAt: new Date().toISOString().slice(0, 10) };
    const exists = state.policies.some((policy) => policy.id === updated.id);
    setState({
      ...state,
      policies: exists ? state.policies.map((policy) => policy.id === updated.id ? updated : policy) : [...state.policies, updated]
    });
    setDraft(updated);
  }

  function createPolicy() {
    setDraft(emptyPolicy());
  }

  return (
    <div className="page-grid">
      <section className="metric-grid">
        <Metric icon={<Scale />} label="政策条目" value={state.policies.length} />
        <Metric icon={<Target />} label="可匹配企业" value={new Set(matches.flatMap((item) => item.companies.map((company) => company.id))).size} />
        <Metric icon={<Sparkles />} label="服务匹配点" value={new Set(state.policies.flatMap((policy) => policy.serviceMatches)).size} />
        <Metric icon={<Building2 />} label="企业池" value={state.companies.length} />
      </section>
      <section className="grid two">
        <Panel title="政策库与企业匹配" action={<button className="button secondary" type="button" onClick={createPolicy}><Plus size={16} /> 新增政策</button>}>
          <div className="policy-list">
            {matches.map(({ policy, companies }) => (
              <button className="policy-card" key={policy.id} type="button" onClick={() => selectPolicy(policy)}>
                <div className="policy-head">
                  <div>
                    <strong>{policy.name}</strong>
                    <span>{policy.level} / {policy.amount} / {policy.status}</span>
                  </div>
                  <em>{companies.length} 家匹配</em>
                </div>
                <p>{policy.decisionValue}</p>
                <div className="policy-tags">
                  {policy.serviceMatches.map((item) => <span key={item}>{item}</span>)}
                </div>
              </button>
            ))}
          </div>
        </Panel>
        <Panel title={draft.id ? "维护政策版本与匹配条件" : "新增政策"}>
          <div className="form-grid">
            <Field label="政策名称" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
            <Field label="政策层级" value={draft.level} onChange={(level) => setDraft({ ...draft, level })} />
            <Field label="支持额度/方式" value={draft.amount} onChange={(amount) => setDraft({ ...draft, amount })} />
            <label>有效状态<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as PolicyRecord["status"] })}><option>有效</option><option>待核实</option><option>已失效</option></select></label>
            <Field label="发布日期" type="date" value={draft.publishedAt} onChange={(publishedAt) => setDraft({ ...draft, publishedAt })} />
            <Field label="有效截止日" type="date" value={draft.validUntil} onChange={(validUntil) => setDraft({ ...draft, validUntil })} />
            <Field label="官方来源链接" value={draft.sourceUrl} onChange={(sourceUrl) => setDraft({ ...draft, sourceUrl })} />
            <Field label="适用企业类型" value={draft.appliesToTypes.join("、")} onChange={(value) => setDraft({ ...draft, appliesToTypes: splitTags(value) })} />
            <Field label="适用产业位置" value={draft.appliesToPositions.join("、")} onChange={(value) => setDraft({ ...draft, appliesToPositions: splitTags(value) })} />
            <Field label="可匹配服务" value={draft.serviceMatches.join("、")} onChange={(value) => setDraft({ ...draft, serviceMatches: splitTags(value) })} />
          </div>
          <label>政策对客户决策的作用<textarea value={draft.decisionValue} onChange={(event) => setDraft({ ...draft, decisionValue: event.target.value })} /></label>
          <div className="drawer-actions-inline"><span className="muted-text">版本 {draft.version || 1} / 最近更新 {draft.lastUpdatedAt || "未保存"}</span><button className="button" type="button" onClick={savePolicy}><CheckCircle2 size={16} /> 保存并重新匹配</button></div>
        </Panel>
      </section>
    </div>
  );
}

function IntelligenceCenter({ state, setState, openCompanyProfile }: { state: AppState; setState: (state: AppState) => void; openCompanyProfile: (id: string) => void }) {
  const workspaceItems = state.intelligence.filter((item) => item.workspaceId === state.activeWorkspaceId);
  const [draft, setDraft] = useState<IntelligenceItem>(() => emptyIntelligence(state.activeWorkspaceId));
  const verifiedCount = workspaceItems.filter((item) => item.verificationStatus === "已核实").length;
  const pendingCount = workspaceItems.filter((item) => item.verificationStatus === "待验证").length;
  const relevantCompanies = new Set(workspaceItems.flatMap((item) => item.companyIds)).size;

  function selectItem(item: IntelligenceItem) {
    setDraft(item);
  }

  function createItem() {
    setDraft(emptyIntelligence(state.activeWorkspaceId));
  }

  function saveItem() {
    if (!draft.title.trim()) return;
    const item = {
      ...draft,
      id: draft.id || uid(),
      workspaceId: state.activeWorkspaceId,
      capturedAt: draft.capturedAt || new Date().toISOString().slice(0, 10)
    };
    const exists = state.intelligence.some((existing) => existing.id === item.id);
    setState({
      ...state,
      intelligence: exists ? state.intelligence.map((existing) => existing.id === item.id ? item : existing) : [...state.intelligence, item]
    });
    setDraft(item);
  }

  return (
    <div className="page-grid">
      <section className="metric-grid">
        <Metric icon={<Search />} label="动态情报" value={workspaceItems.length} />
        <Metric icon={<CheckCircle2 />} label="已核实" value={verifiedCount} />
        <Metric icon={<ClipboardList />} label="待验证" value={pendingCount} />
        <Metric icon={<Building2 />} label="关联企业" value={relevantCompanies} />
      </section>
      <section className="grid two">
        <Panel title="区域动态情报库" action={<button className="button secondary" type="button" onClick={createItem}><Plus size={16} /> 新增情报</button>}>
          <div className="intelligence-list">
            {workspaceItems.map((item) => {
              const companies = state.companies.filter((company) => item.companyIds.includes(company.id));
              const topics = state.topics.filter((topic) => item.topicIds.includes(topic.id));
              return (
                <button className="intelligence-card" key={item.id} type="button" onClick={() => selectItem(item)}>
                  <div className="intelligence-card-head"><span>{item.type}</span><em>{item.verificationStatus}</em></div>
                  <strong>{item.title}</strong>
                  <small>{item.publishedAt || "发布日期待补充"} / 采集于 {item.capturedAt || "待补充"}</small>
                  <p>{item.summary || "暂无摘要。"}</p>
                  <div className="policy-tags">
                    {companies.map((company) => <span key={company.id}>{company.name}</span>)}
                    {topics.map((topic) => <span key={topic.id}>{topic.name}</span>)}
                    {!companies.length && !topics.length ? <span>尚未关联企业或专题</span> : null}
                  </div>
                </button>
              );
            })}
            {!workspaceItems.length ? <div className="empty-stage">暂无动态情报。请录入招投标、采购、新闻、扩产、招聘或认证信息，并关联到企业和研究专题。</div> : null}
          </div>
        </Panel>
        <Panel title={draft.id ? "维护动态情报" : "新增动态情报"}>
          <div className="form-grid">
            <label>情报类型<select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as IntelligenceItem["type"] })}><option>招投标</option><option>采购</option><option>新闻</option><option>扩产</option><option>招聘</option><option>认证</option><option>其他</option></select></label>
            <label>核验状态<select value={draft.verificationStatus} onChange={(event) => setDraft({ ...draft, verificationStatus: event.target.value as IntelligenceItem["verificationStatus"] })}><option>待验证</option><option>已核实</option><option>不相关</option><option>已失效</option></select></label>
            <Field label="标题" value={draft.title} onChange={(title) => setDraft({ ...draft, title })} />
            <Field label="来源链接" value={draft.sourceUrl} onChange={(sourceUrl) => setDraft({ ...draft, sourceUrl })} />
            <Field label="发布日期" type="date" value={draft.publishedAt} onChange={(publishedAt) => setDraft({ ...draft, publishedAt })} />
            <Field label="采集日期" type="date" value={draft.capturedAt} onChange={(capturedAt) => setDraft({ ...draft, capturedAt })} />
            <label>关联企业<select multiple value={draft.companyIds} onChange={(event) => setDraft({ ...draft, companyIds: Array.from(event.currentTarget.selectedOptions, (option) => option.value) })}>{state.companies.filter((company) => company.workspaceId === state.activeWorkspaceId).map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
            <label>关联研究专题<select multiple value={draft.topicIds} onChange={(event) => setDraft({ ...draft, topicIds: Array.from(event.currentTarget.selectedOptions, (option) => option.value) })}>{state.topics.filter((topic) => topic.workspaceId === state.activeWorkspaceId).map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select></label>
          </div>
          <label>摘要与调研价值<textarea value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} /></label>
          <div className="drawer-actions-inline"><span className="muted-text">关联企业可从企业详情进入；关联专题会进入调研准备上下文。</span><button className="button" type="button" onClick={saveItem}><CheckCircle2 size={16} /> 保存情报</button></div>
          {draft.companyIds.length ? <div className="linked-company-actions">{state.companies.filter((company) => draft.companyIds.includes(company.id)).map((company) => <button key={company.id} className="text-button" type="button" onClick={() => openCompanyProfile(company.id)}>查看 {company.name}</button>)}</div> : null}
        </Panel>
      </section>
    </div>
  );
}

function ResearchTasks({ mode, state, setState }: { mode: "project" | "object"; state: AppState; setState: (state: AppState) => void }) {
  const workspaceTasks = state.researchTasks.filter((item) => item.workspaceId === state.activeWorkspaceId);
  const [taskId, setTaskId] = useState(workspaceTasks.find((item) => item.status === "进行中")?.id ?? workspaceTasks[0]?.id ?? "");
  const task = workspaceTasks.find((item) => item.id === taskId);
  const [draft, setDraft] = useState<Omit<ResearchTask, "id">>(() => task ? {
    workspaceId: task.workspaceId,
    name: task.name,
    objective: task.objective,
    topicIds: task.topicIds,
    owner: task.owner,
    startAt: task.startAt,
    endAt: task.endAt,
    status: task.status
  } : emptyTask(state.activeWorkspaceId));
  const [strategy, setStrategy] = useState({
    type: "",
    position: "",
    scale: "",
    intelligenceType: ""
  });
  const [manualCompanyId, setManualCompanyId] = useState("");
  const [manualKeyword, setManualKeyword] = useState("");
  const [manualType, setManualType] = useState("");
  const [manualPosition, setManualPosition] = useState("");
  const [manualScale, setManualScale] = useState("");
  const [recommendationMessage, setRecommendationMessage] = useState("");
  const samples = state.researchSamples.filter((item) => item.taskId === taskId);
  const sampledCompanyIds = new Set(samples.map((item) => item.companyId));
  const candidates = state.companies.filter((company) => company.workspaceId === state.activeWorkspaceId);
  const companyTypes = Array.from(new Set(candidates.map((company) => company.companyType).filter(Boolean))).sort();
  const chainPositions = Array.from(new Set([...candidates.map((company) => company.chainPosition).filter(Boolean), "检验检测/试验验证"])).sort();
  const scales = Array.from(new Set(candidates.map((company) => company.scale).filter(Boolean))).sort();
  const manualCandidates = candidates.filter((company) => {
    const keywordMatches = !manualKeyword || [company.name, company.industry, company.companyType, company.chainPosition, company.scale].join(" ").toLowerCase().includes(manualKeyword.toLowerCase());
    return keywordMatches
      && (!manualType || company.companyType === manualType)
      && (!manualPosition || company.chainPosition === manualPosition)
      && (!manualScale || company.scale === manualScale)
      && !sampledCompanyIds.has(company.id);
  });

  function selectTask(nextTaskId: string) {
    const next = workspaceTasks.find((item) => item.id === nextTaskId);
    setTaskId(nextTaskId);
    setDraft(next ? {
      workspaceId: next.workspaceId,
      name: next.name,
      objective: next.objective,
      topicIds: next.topicIds,
      owner: next.owner,
      startAt: next.startAt,
      endAt: next.endAt,
      status: next.status
    } : emptyTask(state.activeWorkspaceId));
  }

  function createTask() {
    const next = emptyTask(state.activeWorkspaceId);
    setTaskId("");
    setDraft(next);
  }

  function saveTask() {
    if (!draft.name.trim()) return;
    const nextTask: ResearchTask = {
      ...draft,
      id: taskId || uid(),
      workspaceId: state.activeWorkspaceId,
      name: draft.name.trim()
    };
    const exists = state.researchTasks.some((item) => item.id === nextTask.id);
    setState({
      ...state,
      researchTasks: exists
        ? state.researchTasks.map((item) => item.id === nextTask.id ? nextTask : item)
        : [...state.researchTasks, nextTask]
    });
    setTaskId(nextTask.id);
  }

  function deleteTask() {
    if (!task) return;
    const taskPlans = state.plans.filter((plan) => plan.taskId === task.id);
    const taskPlanIds = new Set(taskPlans.map((plan) => plan.id));
    const hasRecords = state.records.some((record) => record.planId && taskPlanIds.has(record.planId));
    if (hasRecords) {
      window.alert("该调研项目已包含调研记录，为保证历史可追溯不能删除。请将项目归档。");
      return;
    }
    if (!window.confirm(`删除调研项目“${task.name}”？其调研对象、访谈提纲和未执行计划也会一并删除。`)) return;
    const nextTasks = state.researchTasks.filter((item) => item.id !== task.id);
    setState({
      ...state,
      researchTasks: nextTasks,
      samplingStrategies: state.samplingStrategies.filter((item) => item.taskId !== task.id),
      researchSamples: state.researchSamples.filter((item) => item.taskId !== task.id),
      questionSets: state.questionSets.filter((item) => item.taskId !== task.id),
      plans: state.plans.filter((item) => item.taskId !== task.id),
      planTargets: state.planTargets.filter((item) => !taskPlanIds.has(item.planId))
    });
    selectTask(nextTasks.find((item) => item.workspaceId === state.activeWorkspaceId)?.id ?? "");
  }

  function generateCandidates() {
    if (!task) return;
    const matches = candidates.filter((company) => {
      const typeMatches = !strategy.type || company.companyType.includes(strategy.type);
      const positionMatches = !strategy.position
        || (strategy.position === "检验检测/试验验证"
          ? /检验|检测|试验|强度|适航/.test(`${company.chainPosition} ${company.industry} ${company.notes}`)
          : company.chainPosition.includes(strategy.position));
      const scaleMatches = !strategy.scale || company.scale.includes(strategy.scale);
      const intelligenceMatches = !strategy.intelligenceType || state.intelligence.some((item) =>
        item.companyIds.includes(company.id) && item.type === strategy.intelligenceType && intelligenceIsRelevant(item)
      );
      return typeMatches && positionMatches && scaleMatches && intelligenceMatches;
    });
    const strategyRecord: SamplingStrategy = {
      id: uid(),
      taskId: task.id,
      companyTypeKeywords: splitTags(strategy.type),
      chainPositionKeywords: splitTags(strategy.position),
      scaleKeywords: splitTags(strategy.scale),
      intelligenceTypes: strategy.intelligenceType ? [strategy.intelligenceType] : [],
      createdAt: new Date().toISOString().slice(0, 10)
    };
    const newSamples: ResearchSample[] = matches
      .filter((company) => !sampledCompanyIds.has(company.id))
      .map((company) => ({
        id: uid(),
        taskId: task.id,
        companyId: company.id,
        sampleRole: "推荐对象",
        selectionReason: `匹配选样策略：${[
          strategy.type && `企业类型=${strategy.type}`,
          strategy.position && `产业位置=${strategy.position}`,
          strategy.scale && `企业规模=${strategy.scale}`,
          strategy.intelligenceType && `动态情报=${strategy.intelligenceType}`
        ].filter(Boolean).join("；") || "区域企业池"}`,
        priority: "中",
        status: "候选",
        snapshotAt: new Date().toISOString().slice(0, 10)
      }));
    setRecommendationMessage(matches.length
      ? `已匹配 ${matches.length} 家企业，其中新增 ${newSamples.length} 家到本项目调研对象。`
      : "当前条件下没有匹配企业，请调整企业角色、产业链环节或规模条件。");
    setState({
      ...state,
      samplingStrategies: [...state.samplingStrategies, strategyRecord],
      researchSamples: [...state.researchSamples, ...newSamples]
    });
  }

  function addSample(companyId: string) {
    if (!task || sampledCompanyIds.has(companyId)) return;
    setState({
      ...state,
      researchSamples: [...state.researchSamples, {
        id: uid(),
        taskId: task.id,
        companyId,
        sampleRole: "人工补充样本",
        selectionReason: "人工从企业库选择纳入本任务。",
        priority: "中",
        status: "已选定",
        snapshotAt: new Date().toISOString().slice(0, 10)
      }]
    });
  }

  function updateSample(sampleId: string, patch: Partial<ResearchSample>) {
    setState({
      ...state,
      researchSamples: state.researchSamples.map((item) => item.id === sampleId ? { ...item, ...patch } : item)
    });
  }

  function deleteSample(sample: ResearchSample) {
    const isPlanned = state.planTargets.some((target) => target.sampleId === sample.id);
    if (isPlanned) {
      window.alert("该企业已进入调研计划，不能直接移除。请先删除未执行的调研计划。");
      return;
    }
    const company = state.companies.find((item) => item.id === sample.companyId);
    if (!window.confirm(`从本项目移除“${company?.name || "该企业"}”？`)) return;
    setState({ ...state, researchSamples: state.researchSamples.filter((item) => item.id !== sample.id) });
  }

  return (
    mode === "project" ? (
      <div className="grid">
        <Panel title="调研项目">
        <div className="form-grid">
          <label>当前调研项目<select value={taskId} onChange={(event) => selectTask(event.target.value)}>
            <option value="">新建调研项目</option>
            {workspaceTasks.map((item) => <option key={item.id} value={item.id}>{item.name} / {item.status}</option>)}
          </select></label>
          <Field label="项目名称" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
          <Field label="负责人" value={draft.owner} onChange={(owner) => setDraft({ ...draft, owner })} />
          <label>状态<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as ResearchTask["status"] })}>
            <option>草稿</option><option>进行中</option><option>已完成</option><option>已归档</option>
          </select></label>
          <Field label="开始日期" type="date" value={draft.startAt} onChange={(startAt) => setDraft({ ...draft, startAt })} />
          <Field label="截止日期" type="date" value={draft.endAt} onChange={(endAt) => setDraft({ ...draft, endAt })} />
          <label>关联分析专题<select multiple value={draft.topicIds} onChange={(event) => setDraft({ ...draft, topicIds: Array.from(event.currentTarget.selectedOptions, (option) => option.value) })}>
            {state.topics.filter((item) => item.workspaceId === state.activeWorkspaceId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label>
        </div>
        <label>项目目标<textarea value={draft.objective} onChange={(event) => setDraft({ ...draft, objective: event.target.value })} /></label>
        <div className="form-actions">
          <button className="button secondary" type="button" onClick={createTask}><Plus size={16} /> 新建项目</button>
          <button className="button" type="button" onClick={saveTask}><CheckCircle2 size={16} /> 保存项目</button>
          {task ? <button className="button danger" type="button" onClick={deleteTask}>删除项目</button> : null}
        </div>
        </Panel>
        <Panel title="项目概览">
          <div className="detail-grid">
            <DetailItem label="调研对象" value={`${samples.filter((item) => item.status !== "已排除").length} 家`} />
            <DetailItem label="已制定计划" value={`${state.plans.filter((plan) => plan.taskId === taskId).length} 个`} />
            <DetailItem label="已完成记录" value={`${state.records.filter((record) => state.plans.find((plan) => plan.id === record.planId)?.taskId === taskId).length} 条`} />
            <DetailItem label="关联专题" value={`${draft.topicIds.length} 个`} />
          </div>
        </Panel>
      </div>
    ) : (
      <div className="grid two">
      <Panel title="选择调研对象">
        <div className="form-grid">
          <label>所属调研项目<select value={taskId} onChange={(event) => selectTask(event.target.value)}>
            <option value="">请选择调研项目</option>
            {workspaceTasks.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label>
        </div>
        {!task ? <div className="empty-stage">请先在“调研项目”中创建或选择一个项目。</div> : null}
      </Panel>
      <Panel title="推荐条件">
        <div className="form-grid">
          <label>企业角色<select value={strategy.type} onChange={(event) => setStrategy({ ...strategy, type: event.target.value })}><option value="">不限</option>{companyTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label>产业链环节<select value={strategy.position} onChange={(event) => setStrategy({ ...strategy, position: event.target.value })}><option value="">不限</option>{chainPositions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label>企业规模<select value={strategy.scale} onChange={(event) => setStrategy({ ...strategy, scale: event.target.value })}><option value="">不限</option>{scales.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label>动态情报类型<select value={strategy.intelligenceType} onChange={(event) => setStrategy({ ...strategy, intelligenceType: event.target.value })}>
            <option value="">不限</option><option>招投标</option><option>采购</option><option>新闻</option><option>扩产</option><option>招聘</option><option>认证</option>
          </select></label>
        </div>
        <button className="button" type="button" disabled={!task} onClick={generateCandidates}><Sparkles size={16} /> 推荐调研对象</button>
        {!task ? <p className="muted-text">请选择调研项目后再设置条件。</p> : <p className="muted-text">例如选择“检验检测/试验验证”，系统会匹配企业名称、行业和产业链信息中包含检验、检测、试验、强度或适航的企业。</p>}
        {recommendationMessage ? <p className="field-warning">{recommendationMessage}</p> : null}
        <div className="research-context">
          <strong>本项目调研对象</strong>
          <span>待确认 {samples.filter((item) => item.status === "候选").length} 家；已确认 {samples.filter((item) => item.status === "已选定").length} 家；已安排 {samples.filter((item) => item.status === "已计划").length} 家；已完成 {samples.filter((item) => item.status === "已完成").length} 家。</span>
        </div>
      </Panel>

      <Panel title="推荐结果与已选对象">
        <div className="sample-list">
          {samples.map((sample) => {
            const company = state.companies.find((item) => item.id === sample.companyId);
            return <div className="sample-row" key={sample.id}>
              <div><strong>{company?.name || "企业待补充"}</strong><span>{company?.companyType} / {company?.chainPosition} / {company?.scale}</span><small>{sample.selectionReason}</small></div>
              <div className="sample-controls">
                <label>优先级<select value={sample.priority} onChange={(event) => updateSample(sample.id, { priority: event.target.value as ResearchSample["priority"] })}><option>高</option><option>中</option><option>低</option></select></label>
                <label>调研状态<select value={sample.status} onChange={(event) => updateSample(sample.id, { status: event.target.value as ResearchSample["status"] })}><option value="候选">待确认</option><option value="已选定">已确认</option><option value="已计划">已安排</option><option value="已完成">已完成</option><option value="需复访">需复访</option><option value="已排除">不纳入本轮</option></select></label>
                <button className="icon-button danger-outline" type="button" title="移除调研对象" onClick={() => deleteSample(sample)}><X size={16} /></button>
              </div>
            </div>;
          })}
          {!samples.length ? <div className="empty-stage">尚未推荐调研对象。设置条件后点击“推荐调研对象”，也可以手动从企业库补充。</div> : null}
        </div>
      </Panel>

      <Panel title="从企业库补充">
        <div className="form-grid compact-filters">
          <Field label="名称或行业" value={manualKeyword} onChange={setManualKeyword} />
          <label>企业角色<select value={manualType} onChange={(event) => setManualType(event.target.value)}><option value="">全部</option>{companyTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label>产业链环节<select value={manualPosition} onChange={(event) => setManualPosition(event.target.value)}><option value="">全部</option>{chainPositions.filter((item) => item !== "检验检测/试验验证").map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label>企业规模<select value={manualScale} onChange={(event) => setManualScale(event.target.value)}><option value="">全部</option>{scales.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        </div>
        <label>选择企业<select value={manualCompanyId} onChange={(event) => setManualCompanyId(event.target.value)}>
          <option value="">请选择企业</option>
          {manualCandidates.map((company) => <option key={company.id} value={company.id}>{company.name} / {company.companyType} / {company.chainPosition}</option>)}
        </select></label>
        <button className="button secondary" type="button" disabled={!task || !manualCompanyId} onClick={() => {
          addSample(manualCompanyId);
          setManualCompanyId("");
        }}><Plus size={16} /> 加入本轮调研对象</button>
      </Panel>
      </div>
    )
  );
}

function QuestionGenerator({ state, setState, selectedCompanyId, setSelectedCompanyId }: { state: AppState; setState: (state: AppState) => void; selectedCompanyId: string; setSelectedCompanyId: (id: string) => void }) {
  const selectedCompany = state.companies.find((company) => company.id === selectedCompanyId) ?? state.companies[0];
  const workspaceTasks = state.researchTasks.filter((item) => item.workspaceId === (selectedCompany?.workspaceId ?? state.activeWorkspaceId));
  const [questionTaskId, setQuestionTaskId] = useState(workspaceTasks.find((item) => item.status === "进行中")?.id ?? workspaceTasks[0]?.id ?? "");
  const [draftQuestions, setDraftQuestions] = useState<string[]>(() => selectedCompany ? buildResearchQuestions(selectedCompany, state) : []);
  const [questionSetName, setQuestionSetName] = useState("");
  const [questionSetFocus, setQuestionSetFocus] = useState("首访画像与数字化需求");
  const [questionScope, setQuestionScope] = useState<"general" | "company">("general");
  const generated = selectedCompany ? buildResearchQuestions(selectedCompany, state) : [];
  const companyIntelligence = selectedCompany ? state.intelligence.filter((item) => intelligenceBelongsToCompany(item, selectedCompany.id) && intelligenceIsRelevant(item)) : [];
  const savedQuestionSets = state.questionSets
    .filter((item) => !questionTaskId || item.taskId === questionTaskId)
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));

  function refreshQuestions() {
    if (!selectedCompany) return;
    setDraftQuestions(generated);
  }

  function saveQuestionSet() {
    if (!draftQuestions.length || !questionSetName.trim()) return;
    const questionSet: QuestionSet = {
      id: uid(),
      workspaceId: state.activeWorkspaceId,
      taskId: questionTaskId || undefined,
      companyId: questionScope === "company" ? selectedCompany?.id ?? "" : "",
      name: questionSetName.trim(),
      focus: questionSetFocus.trim(),
      version: 1,
      status: "草稿",
      generatedAt: new Date().toISOString().slice(0, 10),
      items: draftQuestions.map((content, index) => ({
        id: uid(),
        category: "调研问题",
        content,
        basis: "问题库、参考企业画像、关联情报与项目目标",
        order: index + 1
      }))
    };
    setState({ ...state, questionSets: [...state.questionSets, questionSet] });
    setQuestionSetName("");
  }

  function loadQuestionSet(questionSet: QuestionSet) {
    setDraftQuestions(questionSet.items.sort((a, b) => a.order - b.order).map((item) => item.content));
    setQuestionSetName(questionSet.name);
    setQuestionSetFocus(questionSet.focus);
  }

  function freezeQuestionSet(questionSetId: string) {
    setState({
      ...state,
      questionSets: state.questionSets.map((item) => item.id === questionSetId ? { ...item, status: "已冻结", frozenAt: new Date().toISOString().slice(0, 10) } : item)
    });
  }

  function deleteQuestionSet(questionSet: QuestionSet) {
    if (state.planTargets.some((target) => target.questionSetId === questionSet.id)) {
      window.alert("该访谈提纲已用于调研计划，不能删除。");
      return;
    }
    if (!window.confirm(`删除访谈提纲“${questionSet.name}”？`)) return;
    setState({ ...state, questionSets: state.questionSets.filter((item) => item.id !== questionSet.id) });
  }

  return (
    <div className="grid two">
      <Panel title="编制访谈提纲">
        <div className="form-grid">
          <label>所属调研项目<select value={questionTaskId} onChange={(event) => setQuestionTaskId(event.target.value)}>
            <option value="">通用提纲</option>
            {workspaceTasks.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label>
          <label>参考企业<select value={selectedCompany?.id ?? ""} onChange={(event) => {
            setSelectedCompanyId(event.target.value);
            const company = state.companies.find((item) => item.id === event.target.value);
            if (company) setDraftQuestions(buildResearchQuestions(company, state));
          }}>{state.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
          <label>适用范围<select value={questionScope} onChange={(event) => setQuestionScope(event.target.value as "general" | "company")}><option value="general">本项目通用</option><option value="company">仅参考企业</option></select></label>
          <DetailItem label="参考企业角色" value={selectedCompany?.companyType ?? "-"} />
          <DetailItem label="参考产业环节" value={selectedCompany?.chainPosition ?? "-"} />
        </div>
        {companyIntelligence.length ? <div className="research-context"><strong>参考企业的公开线索</strong>{companyIntelligence.map((item) => <span key={item.id}>{item.type}：{item.title}（{item.verificationStatus}）</span>)}</div> : <div className="empty-stage">可先从问题库组装提纲；选择参考企业后，系统会结合企业画像和公开线索补充建议问题。</div>}
        <div className="question-generated-list">
          {draftQuestions.map((question, index) => (
            <label key={`${question}-${index}`}>问题 {index + 1}<textarea value={question} onChange={(event) => setDraftQuestions(draftQuestions.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} /></label>
          ))}
        </div>
        <div className="outline-actions">
          <div className="outline-fields">
            <Field label="访谈提纲名称" value={questionSetName} onChange={setQuestionSetName} />
            <Field label="访谈重点" value={questionSetFocus} onChange={setQuestionSetFocus} />
          </div>
          <div className="outline-action-buttons">
            <button className="button secondary" type="button" onClick={refreshQuestions}><Sparkles size={16} /> 重新生成</button>
            <button className="button" type="button" onClick={saveQuestionSet}><ClipboardList size={16} /> 保存提纲</button>
          </div>
        </div>
      </Panel>

      <Panel title="已保存访谈提纲">
        {savedQuestionSets.length ? <div className="question-set-list">{savedQuestionSets.map((item) => <div className="question-set-card" key={item.id}><button type="button" onClick={() => loadQuestionSet(item)}><strong>{item.name}</strong><span>{item.focus} / {item.companyId ? "仅该企业" : "项目通用"} / {item.status === "已冻结" ? "已定稿" : "编辑中"}</span></button><div className="inline-actions">{item.status === "草稿" ? <button className="text-button" type="button" onClick={() => freezeQuestionSet(item.id)}>定稿</button> : null}<button className="icon-button danger-outline" type="button" title="删除访谈提纲" onClick={() => deleteQuestionSet(item)}><X size={16} /></button></div></div>)}</div> : <div className="empty-stage">当前项目还没有保存的访谈提纲。</div>}
      </Panel>
    </div>
  );
}

function QuestionLibrary({ state, setState }: { state: AppState; setState: (state: AppState) => void }) {
  const [editingTemplate, setEditingTemplate] = useState<QuestionTemplate>(emptyTemplate());
  const [keyword, setKeyword] = useState("");
  const templates = state.questionTemplates.filter((template) => [template.category, template.question, ...template.appliesToTypes, ...template.appliesToPositions].join(" ").toLowerCase().includes(keyword.toLowerCase()));

  function saveTemplate() {
    if (!editingTemplate.question.trim()) return;
    const template = { ...editingTemplate, id: editingTemplate.id || uid() };
    const exists = state.questionTemplates.some((item) => item.id === template.id);
    setState({
      ...state,
      questionTemplates: exists
        ? state.questionTemplates.map((item) => item.id === template.id ? template : item)
        : [...state.questionTemplates, template]
    });
    setEditingTemplate(emptyTemplate());
  }

  function deleteTemplate(template: QuestionTemplate) {
    if (!window.confirm(`删除问题“${template.question}”？`)) return;
    setState({ ...state, questionTemplates: state.questionTemplates.filter((item) => item.id !== template.id) });
    if (editingTemplate.id === template.id) setEditingTemplate(emptyTemplate());
  }

  return (
    <div className="grid two">
      <Panel title={editingTemplate.id ? "编辑问题" : "新增问题"}>
        <div className="template-editor">
          <div className="form-grid">
            <Field label="问题分类" value={editingTemplate.category} onChange={(category) => setEditingTemplate({ ...editingTemplate, category })} />
            <Field label="适用企业角色" value={editingTemplate.appliesToTypes.join("、")} onChange={(value) => setEditingTemplate({ ...editingTemplate, appliesToTypes: splitTags(value) })} />
            <Field label="适用产业链环节" value={editingTemplate.appliesToPositions.join("、")} onChange={(value) => setEditingTemplate({ ...editingTemplate, appliesToPositions: splitTags(value) })} />
          </div>
          <label>问题内容<textarea value={editingTemplate.question} onChange={(event) => setEditingTemplate({ ...editingTemplate, question: event.target.value })} /></label>
          <div className="inline-actions"><button className="button secondary" type="button" onClick={() => setEditingTemplate(emptyTemplate)}>新建问题</button><button className="button" type="button" onClick={saveTemplate}><CheckCircle2 size={16} /> 保存问题</button></div>
        </div>
      </Panel>
      <Panel title="问题列表">
        <div className="toolbar"><div className="search-box"><Search size={17} /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索分类、问题或适用范围" /></div></div>
        <div className="template-list">
          {templates.map((template) => <div className="template-row" key={template.id}><button className="template-main" type="button" onClick={() => setEditingTemplate(template)}><strong>{template.category}</strong><span>{template.question}</span><em>{[...template.appliesToTypes, ...template.appliesToPositions].join(" / ") || "通用"}</em></button><button className="icon-button danger-outline" type="button" title="删除问题" onClick={() => deleteTemplate(template)}><X size={16} /></button></div>)}
          {!templates.length ? <div className="empty-stage">没有匹配的问题。</div> : null}
        </div>
      </Panel>
    </div>
  );
}

function recommendedFocus(company: ResearchCompany) {
  if (company.companyType.includes("链主") || company.chainPosition.includes("总装")) {
    return ["供应商协同与交付计划", "质量体系贯通与数据标准", "产能计划与项目型制造管理", "链上企业数据共享边界"];
  }
  if (company.chainPosition.includes("研发设计") || company.chainPosition.includes("总体设计")) {
    return ["型号研制流程与需求变更管理", "设计-制造-试验数据贯通", "仿真/试验数据管理", "供应商设计协同和技术状态控制"];
  }
  if (company.chainPosition.includes("强度") || company.chainPosition.includes("试验验证")) {
    return ["试验任务计划与资源排程", "试验数据采集、治理与追溯", "试验报告自动化和知识沉淀", "虚拟仿真/数字孪生与实测数据融合"];
  }
  if (company.chainPosition.includes("试飞") || company.chainPosition.includes("适航")) {
    return ["试飞任务计划与风险管理", "飞参/遥测/机载测试数据管理", "适航符合性证据链", "试飞问题闭环和型号知识库"];
  }
  if (company.chainPosition.includes("平台") || company.companyType.includes("平台")) {
    return ["产业数据资源目录", "企业服务和设备共享流程", "政策申报与融资服务数据", "平台与企业系统接口边界"];
  }
  if (company.chainPosition.includes("零部件") || company.chainPosition.includes("精密加工")) {
    return ["订单和工序进度透明", "设备联网与工艺参数采集", "质量追溯和检验数据沉淀", "成本核算与交付风险预警"];
  }
  if (company.chainPosition.includes("材料")) {
    return ["研发试制和配方/工艺版本管理", "批次一致性与检验数据", "设备工艺参数管理", "客户认证和质量文档管理"];
  }
  if (company.chainPosition.includes("无人机") || company.chainPosition.includes("低空")) {
    return ["研发项目管理", "试飞/测试数据管理", "批产准备和供应链协同", "售后运维和政策申报"];
  }
  return ["数字化现状诊断", "核心业务流程梳理", "数据采集和系统集成现状", "近期建设计划和预算约束"];
}

function Plans({ state, setState }: { state: AppState; setState: (state: AppState) => void }) {
  type TargetDraft = {
    sampleId: string;
    companyId: string;
    questionSetId: string;
    scheduledAt: string;
    durationMinutes: string;
    method: string;
    owner: string;
  };
  const workspaceTasks = state.researchTasks.filter((item) => item.workspaceId === state.activeWorkspaceId);
  const [taskId, setTaskId] = useState(workspaceTasks.find((item) => item.status === "进行中")?.id ?? workspaceTasks[0]?.id ?? "");
  const task = workspaceTasks.find((item) => item.id === taskId);
  const [selectedSampleIds, setSelectedSampleIds] = useState<string[]>([]);
  const [targetDrafts, setTargetDrafts] = useState<TargetDraft[]>([]);
  const [planName, setPlanName] = useState("");
  const [planDate, setPlanDate] = useState(new Date().toISOString().slice(0, 10));
  const [owner, setOwner] = useState("我");
  const [objective, setObjective] = useState("了解企业数字化现状、关键痛点、近期建设计划和可匹配能力。");
  const [validation, setValidation] = useState("");
  const eligibleSamples = state.researchSamples.filter((item) => item.taskId === taskId && sampleCanBePlanned(item));
  const selectedSamples = eligibleSamples.filter((item) => selectedSampleIds.includes(item.id));
  const selectedCompanyIds = selectedSamples.map((item) => item.companyId);
  const linkedIntelligence = state.intelligence.filter((item) => item.companyIds.some((companyId) => selectedCompanyIds.includes(companyId)) && intelligenceIsRelevant(item));

  function changeTask(nextTaskId: string) {
    setTaskId(nextTaskId);
    setSelectedSampleIds([]);
    setTargetDrafts([]);
    setValidation("");
  }

  function questionSetFor(companyId: string, questionSetId?: string) {
    return findFrozenQuestionSet(state.questionSets, companyId, taskId, questionSetId);
  }

  function toggleSample(sample: ResearchSample) {
    const isSelected = selectedSampleIds.includes(sample.id);
    if (isSelected) {
      setSelectedSampleIds(selectedSampleIds.filter((id) => id !== sample.id));
      setTargetDrafts(targetDrafts.filter((item) => item.sampleId !== sample.id));
      return;
    }
    const questionSet = questionSetFor(sample.companyId);
    setSelectedSampleIds([...selectedSampleIds, sample.id]);
    setTargetDrafts([...targetDrafts, {
      sampleId: sample.id,
      companyId: sample.companyId,
      questionSetId: questionSet?.id ?? "",
      scheduledAt: planDate,
      durationMinutes: "90",
      method: "现场访谈",
      owner
    }]);
  }

  function updateTargetDraft(sampleId: string, patch: Partial<TargetDraft>) {
    setTargetDrafts(targetDrafts.map((item) => item.sampleId === sampleId ? { ...item, ...patch } : item));
  }

  function createPlan() {
    if (!task || !targetDrafts.length) {
      setValidation("请选择至少一个已确认的调研对象。");
      return;
    }
    if (targetDrafts.some((item) => !item.questionSetId)) {
      setValidation("每家企业都需要选择一份已定稿的访谈提纲。");
      return;
    }
    const planId = uid();
    const targets: PlanTarget[] = targetDrafts.map((draft) => {
      const questionSet = questionSetFor(draft.companyId, draft.questionSetId);
      return {
        id: uid(),
        planId,
        sampleId: draft.sampleId,
        companyId: draft.companyId,
        questionSetId: questionSet?.id,
        questionSnapshot: questionSet?.items.slice().sort((a, b) => a.order - b.order).map((item) => item.content) ?? [],
        scheduledAt: draft.scheduledAt,
        durationMinutes: Number(draft.durationMinutes) || undefined,
        method: draft.method,
        owner: draft.owner,
        status: draft.scheduledAt ? "待执行" : "待安排"
      };
    });
    setState({
      ...state,
      plans: [...state.plans, {
        id: planId,
        workspaceId: state.activeWorkspaceId,
        taskId: task.id,
        name: planName.trim() || `${task.name} / ${planDate}`,
        companyIds: targets.map((item) => item.companyId),
        date: planDate,
        owner,
        objective,
        status: "计划中",
        questionSnapshot: Array.from(new Set(targets.flatMap((item) => item.questionSnapshot))),
        topicIds: task.topicIds,
        intelligenceIds: linkedIntelligence.map((item) => item.id)
      }],
      planTargets: [...state.planTargets, ...targets],
      researchSamples: state.researchSamples.map((item) => selectedSampleIds.includes(item.id) ? { ...item, status: "已计划" as const } : item)
    });
    setSelectedSampleIds([]);
    setTargetDrafts([]);
    setValidation("");
  }

  function updatePlanTarget(targetId: string, patch: Partial<PlanTarget>) {
    setState({
      ...state,
      planTargets: state.planTargets.map((item) => item.id === targetId ? { ...item, ...patch } : item)
    });
  }

  function deletePlan(plan: ResearchPlan) {
    const targets = state.planTargets.filter((item) => item.planId === plan.id);
    const targetIds = new Set(targets.map((item) => item.id));
    if (state.records.some((record) => record.planTargetId && targetIds.has(record.planTargetId))) {
      window.alert("该调研计划已产生调研记录，为保证历史可追溯不能删除。");
      return;
    }
    if (!window.confirm(`删除调研计划“${plan.name || plan.objective}”？`)) return;
    const sampleIds = new Set(targets.map((item) => item.sampleId).filter((id): id is string => Boolean(id)));
    setState({
      ...state,
      plans: state.plans.filter((item) => item.id !== plan.id),
      planTargets: state.planTargets.filter((item) => item.planId !== plan.id),
      researchSamples: state.researchSamples.map((item) => sampleIds.has(item.id) && item.status === "已计划" ? { ...item, status: "已选定" as const } : item)
    });
  }

  const plans = state.plans.filter((item) => item.workspaceId === state.activeWorkspaceId);

  return (
    <div className="grid">
      <section className="grid two">
        <Panel title="制定调研计划">
          <div className="form-grid">
            <label>所属调研项目<select value={taskId} onChange={(event) => changeTask(event.target.value)}>
              <option value="">请选择调研项目</option>
              {workspaceTasks.map((item) => <option key={item.id} value={item.id}>{item.name} / {item.status}</option>)}
            </select></label>
            <Field label="计划名称" value={planName} onChange={setPlanName} />
            <Field label="计划负责人" value={owner} onChange={setOwner} />
            <Field label="计划起始日期" type="date" value={planDate} onChange={setPlanDate} />
          </div>
          <label>计划目标<textarea value={objective} onChange={(event) => setObjective(event.target.value)} /></label>
          <div className="sample-list">
            {eligibleSamples.map((sample) => {
              const company = state.companies.find((item) => item.id === sample.companyId);
              const selected = selectedSampleIds.includes(sample.id);
              return <label className={`sample-select ${selected ? "selected" : ""}`} key={sample.id}>
                <input type="checkbox" checked={selected} onChange={() => toggleSample(sample)} />
                <span><strong>{company?.name || "企业待补充"}</strong><small>{company?.companyType} / {company?.chainPosition} / {sample.priority}优先级</small></span>
              </label>;
            })}
            {task && !eligibleSamples.length ? <div className="empty-stage">本项目还没有已确认的调研对象，请先在“调研对象”中确认企业。</div> : null}
          </div>
        </Panel>

        <Panel title="逐企业安排">
          <div className="target-draft-list">
            {targetDrafts.map((item) => {
              const company = state.companies.find((companyItem) => companyItem.id === item.companyId);
              const availableSets = state.questionSets
                .filter((set) => (!set.companyId || set.companyId === item.companyId) && set.status === "已冻结" && (!taskId || !set.taskId || set.taskId === taskId))
                .sort((a, b) => (b.frozenAt || b.generatedAt).localeCompare(a.frozenAt || a.generatedAt));
              return <div className="target-draft" key={item.sampleId}>
                <strong>{company?.name || "企业待补充"}</strong>
                <div className="form-grid">
                  <label>访谈提纲<select value={item.questionSetId} onChange={(event) => updateTargetDraft(item.sampleId, { questionSetId: event.target.value })}>
                    <option value="">请选择已定稿提纲</option>
                    {availableSets.map((set) => <option key={set.id} value={set.id}>{set.name} / v{set.version} / {set.items.length}题</option>)}
                  </select></label>
                  <Field label="预约日期" type="date" value={item.scheduledAt} onChange={(scheduledAt) => updateTargetDraft(item.sampleId, { scheduledAt })} />
                  <Field label="预计时长(分钟)" type="number" value={item.durationMinutes} onChange={(durationMinutes) => updateTargetDraft(item.sampleId, { durationMinutes })} />
                  <Field label="调研方式" value={item.method} onChange={(method) => updateTargetDraft(item.sampleId, { method })} />
                  <Field label="执行人" value={item.owner} onChange={(targetOwner) => updateTargetDraft(item.sampleId, { owner: targetOwner })} />
                </div>
                {!availableSets.length ? <small className="field-warning">请先到“访谈提纲”保存并定稿一份适用于该企业或本项目的提纲。</small> : null}
              </div>;
            })}
            {!targetDrafts.length ? <div className="empty-stage">从左侧选择调研对象后，可分别安排提纲、时间、方式和执行人。</div> : null}
          </div>
          {validation ? <p className="field-warning">{validation}</p> : null}
          <button className="button" type="button" onClick={createPlan}><CalendarDays size={16} /> 创建调研计划</button>
        </Panel>
      </section>

      <Panel title="调研计划">
        <div className="plan-target-board">
          {plans.map((plan) => {
            const targets = state.planTargets.filter((item) => item.planId === plan.id);
            return <div className="plan-target-group" key={plan.id}>
              <div className="plan-target-heading"><div><strong>{plan.name || plan.objective}</strong><span>{plan.date} / {plan.owner} / {plan.status} / {targets.length} 家企业安排</span></div><button className="icon-button danger-outline" type="button" title="删除调研计划" onClick={() => deletePlan(plan)}><X size={16} /></button></div>
              {targets.map((target) => {
                const company = state.companies.find((item) => item.id === target.companyId);
                const questionSet = state.questionSets.find((item) => item.id === target.questionSetId);
                return <div className="plan-target-row" key={target.id}>
                  <div><strong>{company?.name || "企业待补充"}</strong><small>{questionSet?.name || `问题 ${target.questionSnapshot.length} 条`}</small></div>
                  <Field label="日期" type="date" value={target.scheduledAt} onChange={(scheduledAt) => updatePlanTarget(target.id, { scheduledAt })} />
                  <Field label="方式" value={target.method} onChange={(method) => updatePlanTarget(target.id, { method })} />
                  <label>状态<select value={target.status} onChange={(event) => updatePlanTarget(target.id, { status: event.target.value as PlanTarget["status"] })}>
                    <option>待安排</option><option>已预约</option><option>待执行</option><option>执行中</option><option disabled>已完成</option><option>已取消</option>
                  </select></label>
                </div>;
              })}
            </div>;
          })}
          {!plans.length ? <div className="empty-stage">尚未生成调研计划。</div> : null}
        </div>
      </Panel>
    </div>
  );
}

function Records({ state, setState, selectedCompanyId }: { state: AppState; setState: (state: AppState) => void; selectedCompanyId: string }) {
  const [companyId, setCompanyId] = useState(selectedCompanyId);
  const [planTargetId, setPlanTargetId] = useState("");
  const [summary, setSummary] = useState("");
  const [transcript, setTranscript] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [audio, setAudio] = useState<{ name: string; url: string } | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [need, setNeed] = useState<Omit<NeedItem, "id">>({
    category: "生产执行",
    description: "",
    priority: "中",
    capability: "MES/MOM实施落地",
    status: "待确认"
  });
  const [needs, setNeeds] = useState<NeedItem[]>([]);

  function addNeed() {
    if (!need.description.trim()) return;
    setNeeds([...needs, { ...need, id: uid(), capability: matchCapability(need.description, state.capabilities).name }]);
    setNeed({ ...need, description: "" });
  }

  function saveRecord() {
    const planTarget = state.planTargets.find((item) => item.id === planTargetId);
    if (!companyId || !planTarget || state.records.some((record) => record.planTargetId === planTarget.id)) return;
    const record: ResearchRecord = {
      id: uid(),
      workspaceId: state.companies.find((company) => company.id === companyId)?.workspaceId ?? state.activeWorkspaceId,
      planId: planTarget.planId,
      planTargetId: planTarget.id,
      companyId,
      date: new Date().toISOString().slice(0, 10),
      interviewer: "我",
      summary,
      transcript,
      audioName: audio?.name,
      audioUrl: audio?.url,
      needs,
      conclusion
    };
    const nextPlanTargets = state.planTargets.map((item) => item.id === planTarget.id ? { ...item, status: "已完成" as const } : item);
    setState({
      ...state,
      records: [...state.records, record],
      companies: state.companies.map((company) => company.id === companyId ? { ...company, status: "已完成" } : company),
      planTargets: nextPlanTargets,
      researchSamples: state.researchSamples.map((item) => item.id === planTarget.sampleId ? { ...item, status: "已完成" } : item),
      plans: state.plans.map((plan) => {
        const targets = nextPlanTargets.filter((item) => item.planId === plan.id);
        return plan.id === planTarget.planId && targets.length && targets.every((item) => item.status === "已完成")
          ? { ...plan, status: "已完成" as const }
          : plan;
      })
    });
    setSummary("");
    setTranscript("");
    setConclusion("");
    setNeeds([]);
    setAudio(null);
  }

  async function uploadAudio(file: File) {
    setUploadingAudio(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const response = await fetch("/api/files", { method: "POST", body: data });
      if (!response.ok) throw new Error("upload failed");
      const uploaded = await response.json() as { name: string; url: string };
      setAudio(uploaded);
    } finally {
      setUploadingAudio(false);
    }
  }

  return (
    <div className="grid two">
      <Panel title="录入调研记录" action={<label className="file-button"><Upload size={16} /> {uploadingAudio ? "上传中..." : "上传录音"}<input type="file" accept="audio/*" disabled={uploadingAudio} onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) void uploadAudio(file);
      }} /></label>}>
        <div className="form-grid">
          <label>待执行的企业安排<select value={planTargetId} onChange={(event) => {
            const target = state.planTargets.find((item) => item.id === event.target.value);
            setPlanTargetId(event.target.value);
            if (target) setCompanyId(target.companyId);
          }}><option value="">请选择企业安排</option>{state.planTargets.filter((target) => canCreateRecord(target, state.records)).map((target) => <option key={target.id} value={target.id}>{target.scheduledAt} / {state.companies.find((company) => company.id === target.companyId)?.name ?? "企业待补充"}</option>)}</select></label>
          <DetailItem label="调研企业" value={state.companies.find((company) => company.id === companyId)?.name ?? "请选择企业安排"} />
          <Field label="访谈人" value="我" onChange={() => undefined} />
        </div>
        {audio ? <div className="audio-card"><FileAudio size={18} /><span>{audio.name}</span><audio controls src={audio.url} /></div> : null}
        <label>调研摘要<textarea value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="记录企业背景、现状、关键问题和判断" /></label>
        <label>语音转写文本<textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} placeholder="先支持上传录音；后续可接入语音识别服务自动转写。当前可粘贴转写文本。" /></label>
        <label>调研结论<textarea value={conclusion} onChange={(event) => setConclusion(event.target.value)} placeholder="沉淀本企业调研结论、机会判断和下一步动作" /></label>
      </Panel>
      <Panel title="提取数字化需求">
        <div className="form-grid">
          <label>需求类别<select value={need.category} onChange={(event) => setNeed({ ...need, category: event.target.value })}><option>生产执行</option><option>质量追溯</option><option>设备数据</option><option>仓储物流</option><option>经营分析</option><option>数字化规划</option></select></label>
          <label>优先级<select value={need.priority} onChange={(event) => setNeed({ ...need, priority: event.target.value as NeedPriority })}><option>高</option><option>中</option><option>低</option></select></label>
        </div>
        <label>需求描述<textarea value={need.description} onChange={(event) => setNeed({ ...need, description: event.target.value })} /></label>
        <div className="record-actions"><button className="button secondary" type="button" onClick={addNeed}><Sparkles size={16} /> 自动匹配能力并加入</button></div>
        <div className="need-list">
          {needs.map((item) => <NeedCard key={item.id} need={item} />)}
        </div>
        <div className="record-actions"><button className="button" type="button" onClick={saveRecord}><CheckCircle2 size={16} /> 保存调研记录</button></div>
      </Panel>
    </div>
  );
}

function ResearchArchive({ state }: { state: AppState }) {
  const [keyword, setKeyword] = useState("");
  const [taskId, setTaskId] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [chainPosition, setChainPosition] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const tasks = state.researchTasks.filter((item) => item.workspaceId === state.activeWorkspaceId);
  const companies = state.companies.filter((item) => item.workspaceId === state.activeWorkspaceId);
  const companyTypes = Array.from(new Set(companies.map((item) => item.companyType).filter(Boolean))).sort();
  const chainPositions = Array.from(new Set(companies.map((item) => item.chainPosition).filter(Boolean))).sort();
  const rows = useMemo(() => state.records
    .filter((record) => record.workspaceId === state.activeWorkspaceId)
    .map((record) => {
      const company = state.companies.find((item) => item.id === record.companyId);
      const plan = state.plans.find((item) => item.id === record.planId);
      const arrangement = state.planTargets.find((item) => item.id === record.planTargetId);
      const questionSet = state.questionSets.find((item) => item.id === arrangement?.questionSetId);
      return { company, plan, record, arrangement, questionSet };
    })
    .filter((row) => {
      if (!row.company) return false;
      const haystack = [
        row.company.name,
        row.company.companyType,
        row.company.chainPosition,
        row.company.scale,
        row.plan?.objective,
        row.questionSet?.name,
        row.record?.summary,
        row.record?.conclusion
      ].join(" ").toLowerCase();
      const date = row.record.date;
      return (!keyword || haystack.includes(keyword.toLowerCase()))
        && (!taskId || row.plan?.taskId === taskId)
        && (!companyType || row.company.companyType === companyType)
        && (!chainPosition || row.company.chainPosition === chainPosition)
        && (!startAt || date >= startAt)
        && (!endAt || date <= endAt);
    }), [state, keyword, taskId, companyType, chainPosition, startAt, endAt]);
  const needCount = rows.reduce((total, row) => total + row.record.needs.length, 0);

  return (
    <div className="grid">
      <Panel title="调研记录查询">
        <div className="form-grid archive-filters">
          <Field label="企业或内容关键词" value={keyword} onChange={setKeyword} />
          <label>调研项目<select value={taskId} onChange={(event) => setTaskId(event.target.value)}><option value="">全部项目</option>{tasks.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>企业类型<select value={companyType} onChange={(event) => setCompanyType(event.target.value)}><option value="">全部类型</option>{companyTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label>产业链位置<select value={chainPosition} onChange={(event) => setChainPosition(event.target.value)}><option value="">全部位置</option>{chainPositions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <Field label="开始日期" type="date" value={startAt} onChange={setStartAt} />
          <Field label="结束日期" type="date" value={endAt} onChange={setEndAt} />
        </div>
      </Panel>

      <section className="metric-grid">
        <Metric icon={<Mic2 />} label="调研记录" value={rows.length} />
        <Metric icon={<ClipboardList />} label="需求候选" value={needCount} />
        <Metric icon={<FileAudio />} label="含录音记录" value={rows.filter((row) => row.record.audioUrl).length} />
        <Metric icon={<CalendarDays />} label="关联计划" value={new Set(rows.map((row) => row.record.planId).filter(Boolean)).size} />
      </section>

      <Panel title="调研记录">
        <div className="archive-list">
          {rows.map((row) => <article className="archive-row" key={row.record.id}>
            <div className="archive-row-heading">
              <div><strong>{row.company?.name}</strong><span>{row.company?.companyType} / {row.company?.chainPosition} / {row.company?.scale}</span></div>
              <em>{row.record.date}</em>
            </div>
            <div className="archive-meta">
              <span>项目：{tasks.find((item) => item.id === row.plan?.taskId)?.name || "未归属项目"}</span>
              <span>计划：{row.plan?.name || row.plan?.objective || "-"}</span>
              <span>访谈提纲：{row.questionSet?.name || `快照 ${row.arrangement?.questionSnapshot.length ?? 0} 题`}</span>
              <span>录入人：{row.record.interviewer}</span>
            </div>
            <p>{row.record.conclusion || row.record.summary || "已保存调研记录，待补充结论。"}</p>
            {row.record.needs.length ? <div className="policy-tags">{row.record.needs.map((need) => <span key={need.id}>{need.category} / {need.priority} / {need.status}</span>)}</div> : null}
          </article>)}
          {!rows.length ? <div className="empty-stage">当前条件下没有已完成的调研记录。</div> : null}
        </div>
      </Panel>
    </div>
  );
}

function Needs({ state, setState }: { state: AppState; setState: (state: AppState) => void }) {
  const allNeeds = state.records.flatMap((record) => record.needs.map((need) => ({ ...need, recordId: record.id, company: state.companies.find((company) => company.id === record.companyId)?.name ?? "-" })));

  function updateNeedStatus(recordId: string, needId: string, status: NeedStatus) {
    setState({
      ...state,
      records: state.records.map((record) => record.id === recordId ? {
        ...record,
        needs: record.needs.map((need) => need.id === needId ? { ...need, status } : need)
      } : record)
    });
  }

  return (
    <Panel title="需求归纳与确认">
      <div className="need-board">
        {allNeeds.map((need) => <div className="need-with-action" key={`${need.company}-${need.id}`}><NeedCard need={need} company={need.company} /><label>确认状态<select value={need.status} onChange={(event) => updateNeedStatus(need.recordId, need.id, event.target.value as NeedStatus)}><option>待确认</option><option>已确认</option><option>已排除</option></select></label></div>)}
        {!allNeeds.length ? <div className="empty-stage">暂无来自调研记录的需求。完成访谈记录并提取需求后，会在这里进行确认、排除和归纳。</div> : null}
      </div>
    </Panel>
  );
}

function Advice({ state, insights }: { state: AppState; insights: ReturnType<typeof buildInsights> }) {
  return (
    <div className="grid two">
      <Panel title="市场与调研建议">
        <div className="advice-list">
          {insights.suggestions.map((item) => <div className="advice" key={item}><Lightbulb size={18} /><span>{item}</span></div>)}
        </div>
      </Panel>
      <Panel title="区域决策结论草稿">
        <textarea className="conclusion-box" readOnly value={buildConclusion(state, insights)} />
      </Panel>
    </div>
  );
}

function KnowledgeAssets({ state }: { state: AppState }) {
  return (
    <div className="grid">
      <Panel title="服务能力库">
        <div className="capability-list">
          {state.capabilities.map((capability) => (
            <div className="capability-card" key={capability.id}>
              <Settings2 size={18} />
              <div><strong>{capability.name}</strong><span>{capability.description}</span></div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="nav-group"><span>{label}</span>{children}</div>;
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return <button className={active ? "active" : ""} onClick={onClick}>{icon}<span>{label}</span></button>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <div className="metric"><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></div>;
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <section className="panel"><div className="panel-head"><h2>{title}</h2>{action}</div>{children}</section>;
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <Panel title={title}>{children}</Panel>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label>{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function PlanCard({ plan, companies }: { plan: ResearchPlan; companies: ResearchCompany[] }) {
  const companyLabel = companies.length ? `${companies[0].name}${companies.length > 1 ? ` 等 ${companies.length} 家` : ""}` : "企业待补充";
  return <div className="data-card"><strong>{companyLabel}</strong><span>{plan.date} / {plan.owner} / {plan.status}{plan.questionSnapshot?.length ? ` / 问题 ${plan.questionSnapshot.length} 条` : ""}</span><p>{plan.objective}</p></div>;
}

function RecordCard({ record, company }: { record: ResearchRecord; company?: ResearchCompany }) {
  return <div className="data-card"><strong>{company?.name ?? "-"}</strong><span>{record.date} / 需求 {record.needs.length} 条 {record.audioName ? `/ 录音：${record.audioName}` : ""}</span><p>{record.conclusion || record.summary}</p></div>;
}

function NeedCard({ need, company }: { need: NeedItem; company?: string }) {
  return <div className="need-card"><div><strong>{need.category}</strong>{company ? <span>{company}</span> : null}</div><p>{need.description}</p><footer><em>{need.priority}</em><span>{need.capability}</span><span>{need.status}</span></footer></div>;
}

function useServerState() {
  const [state, setStateValue] = useState<AppState>(() => {
    const raw = localStorage.getItem(STORE_KEY);
    const stored = parseStoredState(raw);
    return mergeYanliangCompanies(applyStateVersion(stored ?? initialState) as AppState);
  });
  const [syncStatus, setSyncStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/state");
        if (!response.ok) throw new Error("state load failed");
        const payload = await response.json() as { state: AppState | null };
        const stored = payload.state ?? parseStoredState(localStorage.getItem(STORE_KEY));
        const next = mergeYanliangCompanies(applyStateVersion(stored ?? initialState) as AppState);
        const needsMigrationSave = !payload.state
          || payload.state.dataVersion !== STATE_VERSION
          || ["researchTasks", "samplingStrategies", "researchSamples", "questionSets", "planTargets"].some((key) => !Array.isArray((payload.state as unknown as Record<string, unknown>)[key]));
        if (needsMigrationSave) {
          const saveResponse = await fetch("/api/state", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ state: next })
          });
          if (!saveResponse.ok) throw new Error("initial state save failed");
        }
        if (active) {
          setStateValue(next);
          setSyncStatus("ready");
        }
      } catch {
        if (active) setSyncStatus("error");
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  function setState(next: AppState) {
    const versioned = { ...next, dataVersion: STATE_VERSION };
    setStateValue(versioned);
    void fetch("/api/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: versioned })
    }).then((response) => {
      setSyncStatus(response.ok ? "ready" : "error");
    }).catch(() => setSyncStatus("error"));
  }
  return [state, setState, syncStatus] as const;
}

export function mergeYanliangCompanies(state: AppState): AppState {
  const workspaces = state.workspaces?.length ? state.workspaces : defaultWorkspaces;
  const activeWorkspaceId = workspaces.some((workspace) => workspace.id === state.activeWorkspaceId)
    ? state.activeWorkspaceId
    : workspaces[0]?.id ?? YANLIANG_WORKSPACE_ID;
  const topics = state.topics?.length ? state.topics : defaultYanliangTopics();
  const hypotheses = state.hypotheses?.length ? state.hypotheses : defaultYanliangHypotheses();
  const researchTasks = state.researchTasks?.length ? state.researchTasks : defaultYanliangResearchTasks(activeWorkspaceId, topics);
  const samplingStrategies = state.samplingStrategies ?? [];
  const researchSamples = state.researchSamples ?? [];
  const questionSets = state.questionSets ?? [];
  const policies = state.policies?.length ? state.policies.map((policy) => ({
    ...emptyPolicy(),
    ...policy,
    version: policy.version || 1
  })) : defaultPolicyRecords();
  const intelligence = (state.intelligence ?? []).map((item) => ({
    ...emptyIntelligence(item.workspaceId || activeWorkspaceId),
    ...item,
    workspaceId: item.workspaceId || activeWorkspaceId,
    companyIds: item.companyIds ?? [],
    topicIds: item.topicIds ?? []
  })).filter((item) => workspaces.some((workspace) => workspace.id === item.workspaceId));
  const questionTemplates = state.questionTemplates?.length ? state.questionTemplates : defaultQuestionTemplates();
  const reportCompanyMap = new Map(yanliangCompanies.map((company) => [canonicalCompanyName(company.name), company]));
  const normalizedCompanies = (state.companies ?? [])
    .filter((company) => isYanliangCompany(company) || reportCompanyMap.has(canonicalCompanyName(company.name)))
    .map((company) => ({
      ...company,
      workspaceId: company.workspaceId ?? YANLIANG_WORKSPACE_ID,
      companyType: company.companyType || inferCompanyType(company),
      chainPosition: company.chainPosition || inferChainPosition(company)
    }))
    .map((company) => {
      const reportCompany = reportCompanyMap.get(canonicalCompanyName(company.name));
      return reportCompany ? { ...company, ...reportCompany, id: company.id, status: company.status } : company;
    });
  const seen = new Set<string>();
  const dedupedCompanies = normalizedCompanies.filter((company) => {
    const key = canonicalCompanyName(company.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const additions = yanliangCompanies.filter((company) => !seen.has(canonicalCompanyName(company.name)));
  const companies = additions.length ? [...dedupedCompanies, ...additions] : dedupedCompanies;
  const workspaceByCompanyId = new Map(companies.map((company) => [company.id, company.workspaceId]));
  const plans = (state.plans ?? [])
    .map((plan) => {
      const legacyPlan = plan as ResearchPlan & { companyId?: string };
      const companyIds = (legacyPlan.companyIds?.length ? legacyPlan.companyIds : legacyPlan.companyId ? [legacyPlan.companyId] : []).filter((companyId) => workspaceByCompanyId.has(companyId));
      return {
        ...legacyPlan,
        companyIds,
        workspaceId: legacyPlan.workspaceId ?? workspaceByCompanyId.get(companyIds[0] ?? "") ?? YANLIANG_WORKSPACE_ID
      };
    })
    .filter((plan) => plan.companyIds.length);
  const planTargets = addLegacyPlanTargets(plans, state.planTargets ?? []);
  const records = (state.records ?? [])
    .filter((record) => workspaceByCompanyId.has(record.companyId))
    .map((record) => ({
      ...record,
      planTargetId: record.planTargetId ?? planTargets.find((target) => target.planId === record.planId && target.companyId === record.companyId)?.id,
      workspaceId: record.workspaceId ?? workspaceByCompanyId.get(record.companyId) ?? YANLIANG_WORKSPACE_ID,
      needs: (record.needs ?? []).map((need) => ({ ...need, status: need.status ?? "待确认" }))
    }));
  const sampleCompany = companies.find((company) => company.name === "西安泽达航空制造有限责任公司") ?? companies.find((company) => company.region.includes("阎良"));
  if (!sampleCompany || records.some((record) => record.id === "yanliang-sample-record")) {
    return { ...state, dataVersion: STATE_VERSION, workspaces, activeWorkspaceId, topics, hypotheses, researchTasks, samplingStrategies, researchSamples, questionSets, planTargets, policies, intelligence, companies, plans, records, questionTemplates };
  }
  return {
    ...state,
    dataVersion: STATE_VERSION,
    workspaces,
    activeWorkspaceId,
    topics,
    hypotheses,
    researchTasks,
    samplingStrategies,
    researchSamples,
    questionSets,
    planTargets,
    policies,
    intelligence,
    questionTemplates,
    companies: companies.map((company) => company.id === sampleCompany.id ? { ...company, status: "调研中" } : company),
    plans: [
      ...plans,
      {
        id: "yanliang-sample-plan",
        workspaceId: sampleCompany.workspaceId,
        companyIds: [sampleCompany.id],
        date: new Date().toISOString().slice(0, 10),
        owner: "我",
        objective: "验证阎良区航空制造企业调研闭环，重点了解设备数据采集、质量追溯、生产执行和数字化规划需求。",
        status: "计划中"
      }
    ],
    records: [
      ...records,
      {
        id: "yanliang-sample-record",
        workspaceId: sampleCompany.workspaceId,
        companyId: sampleCompany.id,
        date: new Date().toISOString().slice(0, 10),
        interviewer: "我",
        summary: "样例记录：企业位于阎良区航空制造产业链，公开资料显示具备飞机零件制造能力。调研应关注生产过程透明化、质量追溯、设备联网和订单交付协同。",
        transcript: "这是用于系统功能验证的样例转写文本。正式调研时可上传录音并粘贴或接入语音识别结果。",
        needs: [
          {
            id: "yanliang-need-1",
            category: "设备数据",
            description: "希望将关键加工设备、检验设备和工序状态接入统一数据平台，减少人工统计。",
            priority: "高",
            capability: "设备联网与工业数据采集",
            status: "待确认"
          },
          {
            id: "yanliang-need-2",
            category: "质量追溯",
            description: "航空零部件制造需要强化批次、工序、检验记录和问题追溯链路。",
            priority: "高",
            capability: "质量追溯与数据治理",
            status: "待确认"
          },
          {
            id: "yanliang-need-3",
            category: "数字化规划",
            description: "需要面向阎良区航空制造企业共性需求形成数字化建设路线图和分阶段实施包。",
            priority: "中",
            capability: "数字化诊断与蓝图规划",
            status: "待确认"
          }
        ],
        conclusion: "阎良区航空制造企业样本显示，设备联网、质量追溯和生产执行协同是优先调研方向，可与现有设备采集、MES/MOM和数字化诊断能力形成匹配。"
      }
    ]
  };
}

function defaultYanliangTopics(): ResearchTopic[] {
  return [
    {
      id: "topic-chain-collaboration",
      workspaceId: YANLIANG_WORKSPACE_ID,
      name: "航空链主与配套协同",
      description: "围绕一飞院、西飞、试飞院、强度所与本地制造配套企业，研究设计、制造、验证与交付协同中的共性问题。",
      tags: ["链主协同", "供应链", "质量与交付"],
      status: "调研中"
    },
    {
      id: "topic-quality-evidence",
      workspaceId: YANLIANG_WORKSPACE_ID,
      name: "质量证据链与试验数据",
      description: "研究材料、零部件、强度试验和试飞适航环节中，质量、检验、试验和符合性证据的管理诉求。",
      tags: ["质量追溯", "试验验证", "数据治理"],
      status: "待验证"
    },
    {
      id: "topic-policy-leverage",
      workspaceId: YANLIANG_WORKSPACE_ID,
      name: "政策引导与数字化投入",
      description: "研究技改、智能制造、专精特新、大飞机产业和研发支持政策如何影响企业数字化立项与投入节奏。",
      tags: ["政策杠杆", "技改", "项目包装"],
      status: "待验证"
    }
  ];
}

function defaultYanliangHypotheses(): ResearchHypothesis[] {
  return [
    {
      id: "hypothesis-chain-collaboration",
      workspaceId: YANLIANG_WORKSPACE_ID,
      topicId: "topic-chain-collaboration",
      statement: "链主企业对计划、质量、交付和供应商数据口径的要求，会向本地配套企业传导并形成区域级协同需求。",
      evidence: "已知阎良存在西飞等整机链主及大量航空制造配套企业；需通过链主、一级配套和中小制造企业访谈验证传导机制与实际痛点。",
      status: "待验证"
    },
    {
      id: "hypothesis-quality-evidence",
      workspaceId: YANLIANG_WORKSPACE_ID,
      topicId: "topic-quality-evidence",
      statement: "航空制造企业的数字化诉求不应只归结为 MES，质量证据链、检验/试验数据、工艺参数和问题闭环可能是更具共性的切入口。",
      evidence: "强度所、试飞院、材料工艺和零部件企业在产业中占有关键位置；当前为基于产业结构的推断，尚需调研证据支持。",
      status: "已有支持证据"
    },
    {
      id: "hypothesis-policy-leverage",
      workspaceId: YANLIANG_WORKSPACE_ID,
      topicId: "topic-policy-leverage",
      statement: "将数字化项目与技改、示范试点、研发投入或产业链协同政策结合，可降低中小配套企业的立项与资金门槛。",
      evidence: "系统已归集多类政策匹配规则；需在企业访谈中确认实际申报能力、窗口期和客户内部决策路径。",
      status: "待验证"
    }
  ];
}

function defaultYanliangResearchTasks(workspaceId: string, topics: ResearchTopic[]): ResearchTask[] {
  return [{
    id: "task-yanliang-digital-demand-2026",
    workspaceId,
    name: "阎良航空制造数字化需求试点调研",
    objective: "选取代表性企业，验证区域协同、质量证据链和政策杠杆相关假设，形成可复盘的首轮调研闭环。",
    topicIds: topics.map((topic) => topic.id),
    owner: "我",
    startAt: new Date().toISOString().slice(0, 10),
    endAt: "",
    status: "进行中"
  }];
}

function isYanliangCompany(company: ResearchCompany) {
  const text = `${company.name} ${company.region} ${company.notes}`;
  return text.includes("阎良") || text.includes("航空基地") || text.includes("航空城") || text.includes("西飞") || text.includes("603所") || text.includes("630所") || text.includes("623所") || text.includes("一飞院") || text.includes("试飞院") || text.includes("强度所");
}

function canonicalCompanyName(name: string) {
  return name
    .replace(/（.*?）/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/有限责任公司/g, "有限公司")
    .replace(/股份有限公司/g, "股份公司")
    .replace(/\s+/g, "")
    .trim();
}

function inferCompanyType(company: ResearchCompany) {
  if (company.scale.includes("大型")) return "链主/核心企业";
  if (company.scale.includes("科技型")) return "科技型中小企业";
  if (company.scale.includes("成长")) return "成长型企业";
  return company.status === "已完成" ? "已调研企业" : "待分型企业";
}

function inferChainPosition(company: ResearchCompany) {
  const text = `${company.industry} ${company.notes}`;
  if (text.includes("整机") || text.includes("总装") || text.includes("西飞")) return "整机总装/系统集成";
  if (text.includes("研发设计") || text.includes("总体设计") || text.includes("一飞院") || text.includes("603所")) return "研发设计/总体设计";
  if (text.includes("强度") || text.includes("623所")) return "试验验证/强度验证";
  if (text.includes("试飞") || text.includes("适航") || text.includes("630所")) return "试飞鉴定/适航验证";
  if (text.includes("数据中心") || text.includes("秦创原") || text.includes("实验室") || text.includes("学院")) return "创新平台/产业服务";
  if (text.includes("材料") || text.includes("合金") || text.includes("复合")) return "关键材料/材料配套";
  if (text.includes("无人机") || text.includes("低空")) return "低空经济/无人机";
  if (text.includes("动力")) return "动力系统/动力部件";
  if (text.includes("零部件") || text.includes("机械") || text.includes("加工")) return "零部件/配套制造";
  if (text.includes("食品") || text.includes("羊乳")) return "特色食品全产业链";
  return "产业链位置待补充";
}

function buildInsights(state: AppState) {
  const needs = state.records.flatMap((record) => record.needs);
  const industryData = countBy(state.companies.map((company) => company.industry || "未分类"));
  const statusData = countBy(state.companies.map((company) => company.status));
  const companyTypeData = countBy(state.companies.map((company) => company.companyType || "未分类")).sort((a, b) => b.value - a.value).slice(0, 8);
  const chainPositionData = countBy(state.companies.map((company) => company.chainPosition || "未分类")).sort((a, b) => b.value - a.value).slice(0, 10);
  const categoryData = countBy(needs.map((need) => need.category)).sort((a, b) => b.value - a.value).slice(0, 6);
  const capabilityHits = countBy(needs.map((need) => need.capability)).sort((a, b) => b.value - a.value);
  const topChain = chainPositionData.find((item) => !item.name.includes("待补充") && item.name !== "未分类")?.name ?? "产业链位置待补充";
  const chainSuggestions = [
    `从产业链位置看，当前样本最多集中在“${topChain}”，调研问题应围绕该环节的共性业务流程展开。`,
    "链主企业重点看供应链协同、质量体系贯通、产能计划和生态数据标准；配套企业重点看订单协同、工艺过程透明、质量追溯和成本核算。",
    "关键材料和特种工艺企业要重点关注研发试制、批次一致性、检验数据沉淀、设备工艺参数管理。",
    "低空经济/无人机企业处在新赛道，除生产制造外，还要关注研发项目管理、试飞/测试数据、售后运维和政策申报。"
  ];
  const suggestions = [
    state.companies.some((company) => company.status === "待调研") ? "优先把待调研企业按行业和规模分组，先覆盖样本代表性强的企业。" : "当前企业已形成一定调研覆盖，可以开始沉淀区域共通需求。",
    categoryData[0] ? `当前最高频需求是“${categoryData[0].name}”，建议设计标准化访谈追问和解决方案包。` : "调研记录还不够，建议每家企业至少沉淀3条结构化需求。",
    capabilityHits[0] ? `能力匹配最多的是“${capabilityHits[0].name}”，可作为区域切入的优先产品化能力。` : "建议先完善能力库关键词，提升需求与能力的自动匹配效果。",
    "每次访谈后当天完成录音、纪要、需求标签和下一步动作，避免调研信息散落。"
  ];
  return { needs, industryData, statusData, companyTypeData, chainPositionData, categoryData, capabilityHits, suggestions, chainSuggestions };
}

function buildConclusion(state: AppState, insights: ReturnType<typeof buildInsights>) {
  const topNeed = insights.categoryData[0]?.name ?? "暂无明确高频需求";
  const topCapability = insights.capabilityHits[0]?.name ?? "暂无明确能力匹配";
  return [
    `本区域已纳入 ${state.companies.length} 家制造企业，形成 ${state.records.length} 条调研记录，沉淀 ${insights.needs.length} 条结构化数字化需求。`,
    `从当前样本看，高频需求集中在“${topNeed}”，说明区域企业在该方向存在共通改进空间。`,
    `与现有能力匹配度最高的是“${topCapability}”，可作为后续方案设计、样板企业选择和区域推广的优先切入点。`,
    "下一步建议继续补齐企业样本，按行业/规模分层访谈，并把高优先级需求转化为标准方案包、实施路径和投入产出假设。"
  ].join("\n\n");
}

function buildChainStages(companies: ResearchCompany[]) {
  const stages = [
    { key: "design", name: "研发设计/总体论证", description: "一飞院等设计研究单位，承担总体方案、系统集成和型号研制源头" },
    { key: "strength", name: "试验验证/强度鉴定", description: "强度、静力、疲劳、环境适应性和验证鉴定能力" },
    { key: "materials", name: "关键材料/特种工艺", description: "合金、复合材料、锻造、旋压、陶瓷基等上游能力" },
    { key: "parts", name: "零部件/部附件", description: "零件加工、部附件、功能件和本地供应商配套" },
    { key: "structures", name: "结构件/大部件", description: "金属结构件、部段制造、自动钻铆等关键制造环节" },
    { key: "assembly", name: "整机总装/系统集成", description: "链主企业、总装集成、供应链和质量标准牵引" },
    { key: "flight", name: "试飞/适航/检测", description: "试飞院等承担飞行试验、适航验证、检测评价" },
    { key: "maintenance", name: "维修保障/航材服务", description: "航材保障、维修制造、后市场服务和运行支持" },
    { key: "low-altitude", name: "低空经济/无人机", description: "无人机整机、感知系统、测试与运营新场景" },
    { key: "platform", name: "创新平台/教学培训", description: "秦创原、航空大数据中心、实验室、院校等产业支撑平台" }
  ];

  const stageKeyOf = (company: ResearchCompany) => {
    const text = `${company.chainPosition} ${company.industry} ${company.companyType} ${company.name}`;
    if (text.includes("研发设计") || text.includes("总体设计") || text.includes("设计研究") || text.includes("一飞院")) return "design";
    if (text.includes("试飞") || text.includes("适航") || text.includes("检测") || text.includes("试飞院")) return "flight";
    if (text.includes("强度") || text.includes("试验验证") || text.includes("强度所")) return "strength";
    if (text.includes("材料") || text.includes("合金") || text.includes("复合") || text.includes("锻件") || text.includes("成形") || text.includes("工艺")) return "materials";
    if (text.includes("结构件") || text.includes("大部件") || text.includes("部段") || text.includes("智能工艺装备")) return "structures";
    if (text.includes("零部件") || text.includes("部附件") || text.includes("精密加工") || text.includes("功能部件") || text.includes("配套")) return "parts";
    if (text.includes("整机") || text.includes("总装") || text.includes("系统集成") || text.includes("西飞")) return "assembly";
    if (text.includes("维修") || text.includes("航材") || text.includes("保障")) return "maintenance";
    if (text.includes("低空") || text.includes("无人机") || text.includes("感知")) return "low-altitude";
    if (text.includes("创新平台") || text.includes("孵化") || text.includes("数据平台") || text.includes("教学培训") || text.includes("人才") || text.includes("实验室")) return "platform";
    return "parts";
  };

  return stages.map((stage) => ({
    ...stage,
    companies: companies.filter((company) => stageKeyOf(company) === stage.key)
  }));
}

function buildCoreRelations(companies: ResearchCompany[]) {
  const by = (predicate: (company: ResearchCompany) => boolean) => companies.filter(predicate);
  const design = by((company) => company.chainPosition.includes("研发设计") || company.name.includes("一飞院"));
  const manufacturing = by((company) => company.chainPosition.includes("整机总装") || company.chainPosition.includes("结构件") || company.chainPosition.includes("零部件"));
  const strength = by((company) => company.chainPosition.includes("强度") || company.chainPosition.includes("材料") || company.name.includes("强度所"));
  const flight = by((company) => company.chainPosition.includes("试飞") || company.chainPosition.includes("适航") || company.name.includes("试飞院"));
  const platform = by((company) => company.companyType.includes("平台") || company.chainPosition.includes("平台"));

  return [
    {
      name: "一飞院",
      role: "设计源头/总体论证",
      relations: [
        { label: "设计输入与型号需求", targets: design },
        { label: "设计发放到制造", targets: manufacturing },
        { label: "试验验证反馈", targets: strength },
        { label: "试飞问题回传", targets: flight }
      ]
    },
    {
      name: "西飞",
      role: "整机总装/链主牵引",
      relations: [
        { label: "承接设计与工艺转化", targets: design },
        { label: "供应商/配套制造协同", targets: manufacturing },
        { label: "质量与强度验证闭环", targets: strength },
        { label: "交付试飞与问题归零", targets: flight }
      ]
    },
    {
      name: "试飞院",
      role: "飞行试验/适航鉴定",
      relations: [
        { label: "试飞任务与型号状态", targets: design },
        { label: "总装交付与试飞准备", targets: manufacturing },
        { label: "飞参/遥测/问题闭环", targets: flight },
        { label: "数据回传与知识沉淀", targets: platform }
      ]
    },
    {
      name: "强度所",
      role: "强度试验/验证鉴定",
      relations: [
        { label: "试验需求来自设计", targets: design },
        { label: "试件与制造过程关联", targets: manufacturing },
        { label: "材料/结构验证数据", targets: strength },
        { label: "验证结论回写型号", targets: design }
      ]
    }
  ];
}

function defaultPolicyRecords(): PolicyRecord[] {
  return defaultPolicySupports().map((policy) => ({
    ...policy,
    sourceUrl: "",
    publishedAt: "",
    validUntil: "",
    status: "待核实",
    version: 1,
    lastUpdatedAt: ""
  }));
}

function defaultPolicySupports(): Array<Omit<PolicyRecord, "sourceUrl" | "publishedAt" | "validUntil" | "status" | "version" | "lastUpdatedAt">> {
  return [
    {
      id: "tech-upgrade",
      name: "企业技术改造奖补",
      level: "西安市级先进制造业政策",
      amount: "最高2000万元",
      appliesToTypes: ["链主", "支柱", "重点", "入区", "科技型"],
      appliesToPositions: ["零部件", "整机", "材料", "专用设备", "无人机"],
      serviceMatches: ["设备联网", "MES/MOM", "工业互联网", "数字化车间"],
      decisionValue: "可把数字化项目包装为技改项目，补贴预期能够降低企业一次性投入压力。"
    },
    {
      id: "rd-subsidy",
      name: "研发投入后补助",
      level: "市级/省级研发政策",
      amount: "按研发投入比例补助，单户最高数百万元",
      appliesToTypes: ["科研", "链主", "重点", "科技型", "创新平台"],
      appliesToPositions: ["研发设计", "强度", "试飞", "材料", "低空"],
      serviceMatches: ["研发项目管理", "试验数据管理", "知识库", "数字孪生"],
      decisionValue: "适合把研发、试验、设计数据治理类项目纳入研发费用和技术攻关预算。"
    },
    {
      id: "specialized",
      name: "专精特新/小巨人奖补",
      level: "陕西省/西安市/航空基地",
      amount: "20万-30万元及区级配套",
      appliesToTypes: ["科技型", "成长型", "重点"],
      appliesToPositions: ["零部件", "精密加工", "材料", "部附件"],
      serviceMatches: ["数字化诊断", "管理体系提升", "质量追溯", "数据治理"],
      decisionValue: "可把数字化诊断与管理提升作为专精特新申报和成长培育的支撑材料。"
    },
    {
      id: "industrial-chain",
      name: "产业集群招商与链主配套支持",
      level: "先进制造业强市政策",
      amount: "链主引进配套企业累计最高5000万元",
      appliesToTypes: ["链主"],
      appliesToPositions: ["整机总装", "系统集成"],
      serviceMatches: ["供应链协同", "供应商质量管理", "产业链数据平台"],
      decisionValue: "适合链主牵引配套企业共同建设协同平台，把单企项目升级为产业链项目。"
    },
    {
      id: "industrial-internet",
      name: "智能制造/工业互联网试点示范",
      level: "国家级资金配套/市级奖励",
      amount: "国家级示范、工业互联网试点等可获奖励或配套",
      appliesToTypes: ["链主", "支柱", "重点", "平台"],
      appliesToPositions: ["整机", "零部件", "材料", "平台", "数据平台"],
      serviceMatches: ["工业互联网平台", "设备共享", "数据中台", "质量追溯"],
      decisionValue: "可用示范试点目标提升项目战略优先级，减少客户只按成本采购评估的阻力。"
    },
    {
      id: "big-aircraft",
      name: "大飞机产业专项与配套能力建设",
      level: "航空基地特色政策",
      amount: "大飞机产业基金、73+N扩产项目清单动态更新",
      appliesToTypes: ["链主", "重点", "入区"],
      appliesToPositions: ["整机", "零部件", "部附件", "结构件", "试飞", "强度"],
      serviceMatches: ["大飞机供应链协同", "质量证据链", "试验试飞数据闭环"],
      decisionValue: "适合围绕C919/大飞机配套能力建设，把数字化服务嵌入扩产、质量和交付能力提升。"
    }
  ];
}

function generateQuestions(company: ResearchCompany, templates: QuestionTemplate[]) {
  const matched = templates.filter((template) => templateMatchesCompany(template, company));
  const fallback = templates.filter((template) => !template.appliesToTypes.length && !template.appliesToPositions.length);
  return Array.from(new Set([...(matched.length ? matched : fallback), ...fallback].map((template) => template.question))).slice(0, 12);
}

function buildResearchQuestions(company: ResearchCompany, state: AppState) {
  const intelligenceQuestions = state.intelligence
    .filter((item) => intelligenceBelongsToCompany(item, company.id) && intelligenceIsRelevant(item))
    .map((item) => `围绕“${item.title}”这条${item.type}线索，实际项目背景、预算/优先级、牵头部门和下一步计划分别是什么？`);
  const topicQuestions = state.intelligence
    .filter((item) => intelligenceBelongsToCompany(item, company.id) && intelligenceIsRelevant(item))
    .flatMap((item) => item.topicIds)
    .map((topicId) => state.topics.find((topic) => topic.id === topicId)?.name)
    .filter((topic): topic is string => Boolean(topic))
    .map((topic) => `这项工作与研究专题“${topic}”有哪些关联？企业最需要区域协同或政策支持的环节是什么？`);
  return Array.from(new Set([...generateQuestions(company, state.questionTemplates), ...intelligenceQuestions, ...topicQuestions])).slice(0, 14);
}

function templateMatchesCompany(template: QuestionTemplate, company: ResearchCompany) {
  const typeMatched = !template.appliesToTypes.length || template.appliesToTypes.some((type) => company.companyType.includes(type) || type.includes(company.companyType));
  const positionMatched = !template.appliesToPositions.length || template.appliesToPositions.some((position) => company.chainPosition.includes(position) || position.includes(company.chainPosition));
  return typeMatched && positionMatched;
}

function defaultQuestionTemplates(): QuestionTemplate[] {
  return [
    template("基础画像", [], [], "企业当前核心产品、主要客户、生产组织模式和近期经营压力是什么？"),
    template("基础画像", [], [], "当前已建设哪些系统（ERP、MES、WMS、QMS、SCADA、数据平台），使用效果和主要问题是什么？"),
    template("研发设计", ["科研"], ["研发设计", "总体设计"], "型号研制过程中，需求、构型、技术状态、设计变更和试验反馈如何管理？"),
    template("研发设计", ["科研"], ["研发设计", "总体设计"], "设计、制造、试验、供应商之间的数据如何贯通？是否存在重复录入、版本不一致或证据链不完整问题？"),
    template("试验验证", ["科研"], ["强度", "试验验证"], "试验任务计划、试验资源、试件状态、传感器数据和报告结论目前如何管理？"),
    template("试验验证", ["科研"], ["强度", "试验验证"], "虚拟仿真、实测数据、试验报告和型号知识是否能形成可复用的数据资产？"),
    template("试飞鉴定", ["试飞", "科研"], ["试飞", "适航"], "试飞任务计划、风险识别、飞参/遥测数据、问题闭环和适航符合性证据如何管理？"),
    template("试飞鉴定", ["试飞", "科研"], ["试飞", "适航"], "试飞数据如何回传设计、制造和供应商环节？目前有哪些协同和数据治理难点？"),
    template("平台服务", ["平台"], ["平台", "孵化", "教学培训"], "平台服务了哪些企业？是否沉淀了企业画像、设备共享、融资政策、人才服务和项目孵化数据？"),
    template("链主协同", ["链主"], ["整机总装", "系统集成"], "你们对本地配套企业的交付、质量、数据标准和协同节奏有哪些统一要求？"),
    template("链主协同", ["链主"], ["整机总装", "系统集成"], "供应商协同、质量问题闭环、产能计划和项目交付目前通过什么系统或机制管理？"),
    template("链主协同", ["链主"], ["整机总装", "系统集成"], "是否有建设产业链协同平台、供应商质量平台或链上数据标准的计划？"),
    template("配套制造", [], ["零部件", "精密加工", "部附件", "配套"], "订单来源主要来自哪些链主或一级配套？订单变更、交付节点和质量要求如何传递？"),
    template("配套制造", [], ["零部件", "精密加工", "部附件", "配套"], "工序进度、设备状态、检验结果和返工信息是否能够实时采集和追溯？"),
    template("配套制造", [], ["零部件", "精密加工", "部附件", "配套"], "当前成本核算、工时统计、设备利用率和交付风险预警有哪些痛点？"),
    template("材料工艺", [], ["材料", "合金", "复合", "锻件", "成形"], "研发试制、配方/工艺版本、批次一致性和检验数据如何管理？"),
    template("材料工艺", [], ["材料", "合金", "复合", "锻件", "成形"], "工艺参数、实验数据、客户认证资料是否能形成可追溯的数据链路？"),
    template("低空经济", [], ["低空", "无人机"], "研发项目、试飞测试数据、批产准备和售后运维目前如何管理？"),
    template("低空经济", [], ["低空", "无人机"], "是否存在围绕低空经济平台、测试平台、感知系统、调度平台的建设计划或政策申报需求？"),
    template("招标线索", [], [], "近期是否发布或关注过MES、工业互联网、质量追溯、设备联网、检测平台、数据平台相关招标或采购？"),
    template("机会判断", [], [], "如果只能优先解决一个数字化问题，企业最希望先解决什么？预算、周期、验收方式有什么约束？")
  ];
}

function template(category: string, appliesToTypes: string[], appliesToPositions: string[], question: string): QuestionTemplate {
  return { id: uid(), category, appliesToTypes, appliesToPositions, question };
}

function emptyTemplate(): QuestionTemplate {
  return { id: "", category: "自定义问题", appliesToTypes: [], appliesToPositions: [], question: "" };
}

function emptyTask(workspaceId: string): Omit<ResearchTask, "id"> {
  return {
    workspaceId,
    name: "",
    objective: "",
    topicIds: [],
    owner: "我",
    startAt: new Date().toISOString().slice(0, 10),
    endAt: "",
    status: "草稿"
  };
}

function splitTags(value: string) {
  return value.split(/[、,，;；\s]+/).map((item) => item.trim()).filter(Boolean);
}

function matchCapability(text: string, capabilities: Capability[]) {
  const scored = capabilities.map((capability) => ({
    capability,
    score: capability.keywords.reduce((sum, keyword) => sum + (text.toLowerCase().includes(keyword.toLowerCase()) ? 1 : 0), 0)
  })).sort((a, b) => b.score - a.score);
  return scored[0]?.capability ?? capabilities[0];
}

function countBy(values: string[]) {
  const map = new Map<string, number>();
  values.forEach((value) => map.set(value, (map.get(value) ?? 0) + 1));
  return Array.from(map, ([name, value]) => ({ name, value }));
}

function emptyCompany(): ResearchCompany {
  return { id: "", workspaceId: YANLIANG_WORKSPACE_ID, name: "", region: "", industry: "", companyType: "", chainPosition: "", scale: "", contact: "", status: "待调研", maturity: 30, notes: "" };
}

function emptyPolicy(): PolicyRecord {
  return {
    id: "",
    name: "",
    level: "",
    amount: "",
    appliesToTypes: [],
    appliesToPositions: [],
    serviceMatches: [],
    decisionValue: "",
    sourceUrl: "",
    publishedAt: "",
    validUntil: "",
    status: "待核实",
    version: 1,
    lastUpdatedAt: ""
  };
}

function emptyIntelligence(workspaceId: string): IntelligenceItem {
  return {
    id: "",
    workspaceId,
    type: "招投标",
    title: "",
    sourceUrl: "",
    publishedAt: "",
    capturedAt: new Date().toISOString().slice(0, 10),
    summary: "",
    verificationStatus: "待验证",
    companyIds: [],
    topicIds: []
  };
}

function yanliangCompany(name: string, industry: string, companyType: string, chainPosition: string, scale: string, maturity: number, notes: string): ResearchCompany {
  return {
    id: uid(),
    workspaceId: YANLIANG_WORKSPACE_ID,
    name,
    region: "西安市阎良区 / 西安航空基地",
    industry,
    companyType,
    chainPosition,
    scale,
    contact: "待调研补充",
    status: "待调研",
    maturity,
    notes
  };
}

function stringCell(row: Record<string, unknown>, keys: string[]) {
  const key = keys.find((item) => row[item] !== undefined);
  return key ? String(row[key] ?? "").trim() : "";
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

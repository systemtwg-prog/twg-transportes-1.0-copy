import Clientes from './pages/Clientes';
import OrdensColeta from './pages/OrdensColeta';
import Relatorios from './pages/Relatorios';
import Home from './pages/Home';
import Motoristas from './pages/Motoristas';
import Veiculos from './pages/Veiculos';
import Configuracoes from './pages/Configuracoes';
import Rastreamento from './pages/Rastreamento';
import AtualizarLocalizacao from './pages/AtualizarLocalizacao';
import RelatorioMotoristas from './pages/RelatorioMotoristas';
import ColetasDiarias from './pages/ColetasDiarias';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Clientes": Clientes,
    "OrdensColeta": OrdensColeta,
    "Relatorios": Relatorios,
    "Home": Home,
    "Motoristas": Motoristas,
    "Veiculos": Veiculos,
    "Configuracoes": Configuracoes,
    "Rastreamento": Rastreamento,
    "AtualizarLocalizacao": AtualizarLocalizacao,
    "RelatorioMotoristas": RelatorioMotoristas,
    "ColetasDiarias": ColetasDiarias,
}

export const pagesConfig = {
    mainPage: "Clientes",
    Pages: PAGES,
    Layout: __Layout,
};
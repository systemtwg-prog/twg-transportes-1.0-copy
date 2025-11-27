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
import AdicionarColetaDiaria from './pages/AdicionarColetaDiaria';
import AprovacaoUsuarios from './pages/AprovacaoUsuarios';
import PersonalizarHome from './pages/PersonalizarHome';
import Comprovantes from './pages/Comprovantes';
import Romaneios from './pages/Romaneios';
import Avisos from './pages/Avisos';
import ComprovantesInternos from './pages/ComprovantesInternos';
import NotaDeposito from './pages/NotaDeposito';
import RotasGPS from './pages/RotasGPS';
import Backup from './pages/Backup';
import ImportacaoDocumentos from './pages/ImportacaoDocumentos';
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
    "AdicionarColetaDiaria": AdicionarColetaDiaria,
    "AprovacaoUsuarios": AprovacaoUsuarios,
    "PersonalizarHome": PersonalizarHome,
    "Comprovantes": Comprovantes,
    "Romaneios": Romaneios,
    "Avisos": Avisos,
    "ComprovantesInternos": ComprovantesInternos,
    "NotaDeposito": NotaDeposito,
    "RotasGPS": RotasGPS,
    "Backup": Backup,
    "ImportacaoDocumentos": ImportacaoDocumentos,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
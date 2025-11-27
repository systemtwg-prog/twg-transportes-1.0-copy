import Clientes from './pages/Clientes';
import OrdensColeta from './pages/OrdensColeta';
import Relatorios from './pages/Relatorios';
import Motoristas from './pages/Motoristas';
import Veiculos from './pages/Veiculos';
import Configuracoes from './pages/Configuracoes';
import Rastreamento from './pages/Rastreamento';
import AtualizarLocalizacao from './pages/AtualizarLocalizacao';
import RelatorioMotoristas from './pages/RelatorioMotoristas';
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
import __Layout from './Layout.jsx';


export const PAGES = {
    "Clientes": Clientes,
    "OrdensColeta": OrdensColeta,
    "Relatorios": Relatorios,
    "Motoristas": Motoristas,
    "Veiculos": Veiculos,
    "Configuracoes": Configuracoes,
    "Rastreamento": Rastreamento,
    "AtualizarLocalizacao": AtualizarLocalizacao,
    "RelatorioMotoristas": RelatorioMotoristas,
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
}

export const pagesConfig = {
    mainPage: "Clientes",
    Pages: PAGES,
    Layout: __Layout,
};
import Clientes from './pages/Clientes';
import OrdensColeta from './pages/OrdensColeta';
import Relatorios from './pages/Relatorios';
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
import Avisos from './pages/Avisos';
import NotaDeposito from './pages/NotaDeposito';
import Backup from './pages/Backup';
import ImportacaoDocumentos from './pages/ImportacaoDocumentos';
import Transportadoras from './pages/Transportadoras';
import NotasFiscais from './pages/NotasFiscais';
import MascaraRomaneio from './pages/MascaraRomaneio';
import RomaneiosGerados from './pages/RomaneiosGerados';
import ComprovantesCtes from './pages/ComprovantesCtes';
import RotasGPS from './pages/RotasGPS';
import ComprovantesInternos from './pages/ComprovantesInternos';
import Home from './pages/Home';
import BuscaMultas from './pages/BuscaMultas';
import CrachaIdentificacao from './pages/CrachaIdentificacao';
import ExtratorGoogle from './pages/ExtratorGoogle';
import HomeDesktop from './pages/HomeDesktop';
import ImpressaoRelatorio from './pages/ImpressaoRelatorio';
import ServicosSNF from './pages/ServicosSNF';
import ClientesSNF from './pages/ClientesSNF';
import ConfiguracaoModulos from './pages/ConfiguracaoModulos';
import WhatsAppWeb from './pages/WhatsAppWeb';
import EmailManager from './pages/EmailManager';
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
    "ColetasDiarias": ColetasDiarias,
    "AdicionarColetaDiaria": AdicionarColetaDiaria,
    "AprovacaoUsuarios": AprovacaoUsuarios,
    "PersonalizarHome": PersonalizarHome,
    "Avisos": Avisos,
    "NotaDeposito": NotaDeposito,
    "Backup": Backup,
    "ImportacaoDocumentos": ImportacaoDocumentos,
    "Transportadoras": Transportadoras,
    "NotasFiscais": NotasFiscais,
    "MascaraRomaneio": MascaraRomaneio,
    "RomaneiosGerados": RomaneiosGerados,
    "ComprovantesCtes": ComprovantesCtes,
    "RotasGPS": RotasGPS,
    "ComprovantesInternos": ComprovantesInternos,
    "Home": Home,
    "BuscaMultas": BuscaMultas,
    "CrachaIdentificacao": CrachaIdentificacao,
    "ExtratorGoogle": ExtratorGoogle,
    "HomeDesktop": HomeDesktop,
    "ImpressaoRelatorio": ImpressaoRelatorio,
    "ServicosSNF": ServicosSNF,
    "ClientesSNF": ClientesSNF,
    "ConfiguracaoModulos": ConfiguracaoModulos,
    "WhatsAppWeb": WhatsAppWeb,
    "EmailManager": EmailManager,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
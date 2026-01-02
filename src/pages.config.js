import AdicionarColetaDiaria from './pages/AdicionarColetaDiaria';
import AprovacaoUsuarios from './pages/AprovacaoUsuarios';
import AtualizarLocalizacao from './pages/AtualizarLocalizacao';
import Avisos from './pages/Avisos';
import Backup from './pages/Backup';
import BuscaMultas from './pages/BuscaMultas';
import Clientes from './pages/Clientes';
import ClientesSNF from './pages/ClientesSNF';
import ColetasDiarias from './pages/ColetasDiarias';
import ComprovantesCtes from './pages/ComprovantesCtes';
import ComprovantesInternos from './pages/ComprovantesInternos';
import ConfiguracaoModulos from './pages/ConfiguracaoModulos';
import Configuracoes from './pages/Configuracoes';
import CrachaIdentificacao from './pages/CrachaIdentificacao';
import Destinatarios from './pages/Destinatarios';
import EmailManager from './pages/EmailManager';
import ExtratorGoogle from './pages/ExtratorGoogle';
import Home from './pages/Home';
import HomeDesktop from './pages/HomeDesktop';
import ImportacaoDocumentos from './pages/ImportacaoDocumentos';
import MascaraRomaneio from './pages/MascaraRomaneio';
import Motoristas from './pages/Motoristas';
import NotaDeposito from './pages/NotaDeposito';
import OrdensColeta from './pages/OrdensColeta';
import PersonalizarHome from './pages/PersonalizarHome';
import Rastreamento from './pages/Rastreamento';
import RelatorioMotoristas from './pages/RelatorioMotoristas';
import Relatorios from './pages/Relatorios';
import RomaneiosGerados from './pages/RomaneiosGerados';
import RotasGPS from './pages/RotasGPS';
import ServicosSNF from './pages/ServicosSNF';
import Transportadoras from './pages/Transportadoras';
import Veiculos from './pages/Veiculos';
import WhatsAppWeb from './pages/WhatsAppWeb';
import ImpressaoRelatorio from './pages/ImpressaoRelatorio';
import NotasFiscais from './pages/NotasFiscais';
import Importacao from './pages/Importacao';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdicionarColetaDiaria": AdicionarColetaDiaria,
    "AprovacaoUsuarios": AprovacaoUsuarios,
    "AtualizarLocalizacao": AtualizarLocalizacao,
    "Avisos": Avisos,
    "Backup": Backup,
    "BuscaMultas": BuscaMultas,
    "Clientes": Clientes,
    "ClientesSNF": ClientesSNF,
    "ColetasDiarias": ColetasDiarias,
    "ComprovantesCtes": ComprovantesCtes,
    "ComprovantesInternos": ComprovantesInternos,
    "ConfiguracaoModulos": ConfiguracaoModulos,
    "Configuracoes": Configuracoes,
    "CrachaIdentificacao": CrachaIdentificacao,
    "Destinatarios": Destinatarios,
    "EmailManager": EmailManager,
    "ExtratorGoogle": ExtratorGoogle,
    "Home": Home,
    "HomeDesktop": HomeDesktop,
    "ImportacaoDocumentos": ImportacaoDocumentos,
    "MascaraRomaneio": MascaraRomaneio,
    "Motoristas": Motoristas,
    "NotaDeposito": NotaDeposito,
    "OrdensColeta": OrdensColeta,
    "PersonalizarHome": PersonalizarHome,
    "Rastreamento": Rastreamento,
    "RelatorioMotoristas": RelatorioMotoristas,
    "Relatorios": Relatorios,
    "RomaneiosGerados": RomaneiosGerados,
    "RotasGPS": RotasGPS,
    "ServicosSNF": ServicosSNF,
    "Transportadoras": Transportadoras,
    "Veiculos": Veiculos,
    "WhatsAppWeb": WhatsAppWeb,
    "ImpressaoRelatorio": ImpressaoRelatorio,
    "NotasFiscais": NotasFiscais,
    "Importacao": Importacao,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
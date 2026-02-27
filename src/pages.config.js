/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AdicionarColetaDiaria from './pages/AdicionarColetaDiaria';
import AprovacaoUsuarios from './pages/AprovacaoUsuarios';
import AtualizarLocalizacao from './pages/AtualizarLocalizacao';
import Avisos from './pages/Avisos';
import Backup from './pages/Backup';
import BuscaMultas from './pages/BuscaMultas';
import CTEs from './pages/CTEs';
import Canhoto from './pages/Canhoto';
import Clientes from './pages/Clientes';
import ClientesSNF from './pages/ClientesSNF';
import ColetasDiarias from './pages/ColetasDiarias';
import ComprovantesCtes from './pages/ComprovantesCtes';
import ComprovantesEntrega from './pages/ComprovantesEntrega';
import ComprovantesInternos from './pages/ComprovantesInternos';
import ConfiguracaoModulos from './pages/ConfiguracaoModulos';
import Configuracoes from './pages/Configuracoes';
import ConsultaSEFAZ from './pages/ConsultaSEFAZ';
import CrachaIdentificacao from './pages/CrachaIdentificacao';
import Destinatarios from './pages/Destinatarios';
import Documentos from './pages/Documentos';
import EmailManager from './pages/EmailManager';
import ExtratorGoogle from './pages/ExtratorGoogle';
import GerenciadorMenu from './pages/GerenciadorMenu';
import Home from './pages/Home';
import HomeDesktop from './pages/HomeDesktop';
import ImportacaoDocumentos from './pages/ImportacaoDocumentos';
import ImpressaoRelatorio from './pages/ImpressaoRelatorio';
import MascaraRomaneio from './pages/MascaraRomaneio';
import Motoristas from './pages/Motoristas';
import NotaDeposito from './pages/NotaDeposito';
import NotasFiscais from './pages/NotasFiscais';
import OrdensColeta from './pages/OrdensColeta';
import PersonalizarHome from './pages/PersonalizarHome';
import Precificacao from './pages/Precificacao';
import Rastreamento from './pages/Rastreamento';
import RelatorioDestinatario from './pages/RelatorioDestinatario';
import RelatorioMotoristas from './pages/RelatorioMotoristas';
import RelatorioNotaFiscal from './pages/RelatorioNotaFiscal';
import Relatorios from './pages/Relatorios';
import RomaneiosGerados from './pages/RomaneiosGerados';
import RotasGPS from './pages/RotasGPS';
import ServicosSNF from './pages/ServicosSNF';
import SincronizacaoFirebase from './pages/SincronizacaoFirebase';
import Transportadoras from './pages/Transportadoras';
import Veiculos from './pages/Veiculos';
import WhatsAppWeb from './pages/WhatsAppWeb';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdicionarColetaDiaria": AdicionarColetaDiaria,
    "AprovacaoUsuarios": AprovacaoUsuarios,
    "AtualizarLocalizacao": AtualizarLocalizacao,
    "Avisos": Avisos,
    "Backup": Backup,
    "BuscaMultas": BuscaMultas,
    "CTEs": CTEs,
    "Canhoto": Canhoto,
    "Clientes": Clientes,
    "ClientesSNF": ClientesSNF,
    "ColetasDiarias": ColetasDiarias,
    "ComprovantesCtes": ComprovantesCtes,
    "ComprovantesEntrega": ComprovantesEntrega,
    "ComprovantesInternos": ComprovantesInternos,
    "ConfiguracaoModulos": ConfiguracaoModulos,
    "Configuracoes": Configuracoes,
    "ConsultaSEFAZ": ConsultaSEFAZ,
    "CrachaIdentificacao": CrachaIdentificacao,
    "Destinatarios": Destinatarios,
    "Documentos": Documentos,
    "EmailManager": EmailManager,
    "ExtratorGoogle": ExtratorGoogle,
    "GerenciadorMenu": GerenciadorMenu,
    "Home": Home,
    "HomeDesktop": HomeDesktop,
    "ImportacaoDocumentos": ImportacaoDocumentos,
    "ImpressaoRelatorio": ImpressaoRelatorio,
    "MascaraRomaneio": MascaraRomaneio,
    "Motoristas": Motoristas,
    "NotaDeposito": NotaDeposito,
    "NotasFiscais": NotasFiscais,
    "OrdensColeta": OrdensColeta,
    "PersonalizarHome": PersonalizarHome,
    "Precificacao": Precificacao,
    "Rastreamento": Rastreamento,
    "RelatorioDestinatario": RelatorioDestinatario,
    "RelatorioMotoristas": RelatorioMotoristas,
    "RelatorioNotaFiscal": RelatorioNotaFiscal,
    "Relatorios": Relatorios,
    "RomaneiosGerados": RomaneiosGerados,
    "RotasGPS": RotasGPS,
    "ServicosSNF": ServicosSNF,
    "SincronizacaoFirebase": SincronizacaoFirebase,
    "Transportadoras": Transportadoras,
    "Veiculos": Veiculos,
    "WhatsAppWeb": WhatsAppWeb,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
import Clientes from './pages/Clientes';
import OrdensColeta from './pages/OrdensColeta';
import Relatorios from './pages/Relatorios';
import Home from './pages/Home';
import Motoristas from './pages/Motoristas';
import Veiculos from './pages/Veiculos';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Clientes": Clientes,
    "OrdensColeta": OrdensColeta,
    "Relatorios": Relatorios,
    "Home": Home,
    "Motoristas": Motoristas,
    "Veiculos": Veiculos,
}

export const pagesConfig = {
    mainPage: "Clientes",
    Pages: PAGES,
    Layout: __Layout,
};
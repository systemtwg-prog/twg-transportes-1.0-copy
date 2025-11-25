import Clientes from './pages/Clientes';
import OrdensColeta from './pages/OrdensColeta';
import Relatorios from './pages/Relatorios';


export const PAGES = {
    "Clientes": Clientes,
    "OrdensColeta": OrdensColeta,
    "Relatorios": Relatorios,
}

export const pagesConfig = {
    mainPage: "Clientes",
    Pages: PAGES,
};
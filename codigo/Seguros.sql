--
-- PostgreSQL database dump
--


-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.2

-- Started on 2026-05-08 14:48:41

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 219 (class 1259 OID 16388)
-- Name: Apolices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Apolices" (
    codigo_apolice character varying CONSTRAINT "Apólices_Código_Apólice_not_null" NOT NULL,
    "Lojista" character varying,
    "Tipo" character varying,
    "Seguradora" character varying,
    "Vigencia" date,
    "Vencimento" date,
    "Status" character varying
);


ALTER TABLE public."Apolices" OWNER TO postgres;

--
-- TOC entry 5006 (class 0 OID 16388)
-- Dependencies: 219
-- Data for Name: Apolices; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."Apolices" (codigo_apolice, "Lojista", "Tipo", "Seguradora", "Vigencia", "Vencimento", "Status") VALUES ('AP-2025-001', 'Livraria Cultura', 'Incêndio', 'Porto Seguro', '2025-08-15', '2026-08-15', 'Ativa');
INSERT INTO public."Apolices" (codigo_apolice, "Lojista", "Tipo", "Seguradora", "Vigencia", "Vencimento", "Status") VALUES ('AL-2025-0034', 'Shopping Flamboyant', 'Responsabilidade Civil', 'Allianz Seguros', '2025-06-22', '2026-06-22', 'Ativa');
INSERT INTO public."Apolices" (codigo_apolice, "Lojista", "Tipo", "Seguradora", "Vigencia", "Vencimento", "Status") VALUES ('AP-2024-112', 'Zara', 'Danos Elétricos', 'Bradesco Seguros', '2024-03-08', '2025-03-08', 'Vencida');
INSERT INTO public."Apolices" (codigo_apolice, "Lojista", "Tipo", "Seguradora", "Vigencia", "Vencimento", "Status") VALUES ('TM-2024-0078', 'Havaianas', 'Roubo e Furto', 'Tokio Marine', '2025-07-30', '2026-07-30', 'Ativa');
INSERT INTO public."Apolices" (codigo_apolice, "Lojista", "Tipo", "Seguradora", "Vigencia", "Vencimento", "Status") VALUES ('SU-2024-4521', 'Renner', 'Alagamento e Infiltração', 'SulAmérica', '2024-03-08', '2025-03-08', 'Vencida');
INSERT INTO public."Apolices" (codigo_apolice, "Lojista", "Tipo", "Seguradora", "Vigencia", "Vencimento", "Status") VALUES ('AP-2025-067', 'Óticas Carol', 'Vidros e Fachadas', 'Liberty Seguros', '2025-09-12', '2026-09-12', 'Ativa');
INSERT INTO public."Apolices" (codigo_apolice, "Lojista", "Tipo", "Seguradora", "Vigencia", "Vencimento", "Status") VALUES ('AP-2025-023', 'Cinemark', 'Incêndio', 'Mapfre Seguros', '2025-10-01', '2026-10-01', 'Ativa');
INSERT INTO public."Apolices" (codigo_apolice, "Lojista", "Tipo", "Seguradora", "Vigencia", "Vencimento", "Status") VALUES ('AP-2024-198', 'C&A', 'Responsabilidade Civil', 'HDI Seguros', '2023-11-15', '2024-11-15', 'Vencida');
INSERT INTO public."Apolices" (codigo_apolice, "Lojista", "Tipo", "Seguradora", "Vigencia", "Vencimento", "Status") VALUES ('TM-2024-9012', 'Outback', 'Incêndio', 'Tokio Marine', '2025-05-20', '2026-05-20', 'A Vencer');
INSERT INTO public."Apolices" (codigo_apolice, "Lojista", "Tipo", "Seguradora", "Vigencia", "Vencimento", "Status") VALUES ('AP-2025-102', 'Fast Shop', 'Equipamentos Eletrônicos', 'Zurich Seguros', '2025-11-03', '2026-11-03', 'Ativa');
INSERT INTO public."Apolices" (codigo_apolice, "Lojista", "Tipo", "Seguradora", "Vigencia", "Vencimento", "Status") VALUES ('AP-2024-234', 'Riachuelo', 'Incêndio', 'Tokio Marine', '2024-01-12', '2025-01-12', 'Vencida');
INSERT INTO public."Apolices" (codigo_apolice, "Lojista", "Tipo", "Seguradora", "Vigencia", "Vencimento", "Status") VALUES ('AP-2025-156', 'Arezzo', 'Responsabilidade Civil', 'Allianz Seguros', '2026-01-10', '2027-01-10', 'Ativa');
INSERT INTO public."Apolices" (codigo_apolice, "Lojista", "Tipo", "Seguradora", "Vigencia", "Vencimento", "Status") VALUES ('AP-2025-178', 'Vivara', 'Roubo e Furto', 'Bradesco Seguros', '2025-12-15', '2026-12-15', 'Ativa');
INSERT INTO public."Apolices" (codigo_apolice, "Lojista", "Tipo", "Seguradora", "Vigencia", "Vencimento", "Status") VALUES ('AP-2024-267', 'Lojas Americanas', 'Vidros e Fachadas', 'SulAmérica', '2024-02-20', '2025-02-20', 'Vencida');
INSERT INTO public."Apolices" (codigo_apolice, "Lojista", "Tipo", "Seguradora", "Vigencia", "Vencimento", "Status") VALUES ('AP-2025-190', 'Subway', 'Alagamento e Infiltração', 'Liberty Seguros', '2026-02-05', '2027-02-05', 'Ativa');
INSERT INTO public."Apolices" (codigo_apolice, "Lojista", "Tipo", "Seguradora", "Vigencia", "Vencimento", "Status") VALUES ('AP-2025-201', 'McDonald''s', 'Danos Elétricos', 'Mapfre Seguros', '2026-03-18', '2027-03-18', 'Ativa');
INSERT INTO public."Apolices" (codigo_apolice, "Lojista", "Tipo", "Seguradora", "Vigencia", "Vencimento", "Status") VALUES ('AP-2024-289', 'Pernambucanas', 'Incêndio', 'HDI Seguros', '2023-12-01', '2024-12-01', 'Vencida');
INSERT INTO public."Apolices" (codigo_apolice, "Lojista", "Tipo", "Seguradora", "Vigencia", "Vencimento", "Status") VALUES ('AP-2025-213', 'Cacau Show', 'Responsabilidade Civil', 'Porto Seguro', '2025-08-25', '2026-08-25', 'Ativa');
INSERT INTO public."Apolices" (codigo_apolice, "Lojista", "Tipo", "Seguradora", "Vigencia", "Vencimento", "Status") VALUES ('AP-2025-225', 'Pandora', 'Roubo e Furto', 'Zurich Seguros', '2026-04-12', '2027-04-12', 'Ativa');
INSERT INTO public."Apolices" (codigo_apolice, "Lojista", "Tipo", "Seguradora", "Vigencia", "Vencimento", "Status") VALUES ('AP-2024-301', 'Marisa', 'Equipamentos Eletrônicos', 'Tokio Marine', '2024-04-15', '2025-04-15', 'Vencida');
INSERT INTO public."Apolices" (codigo_apolice, "Lojista", "Tipo", "Seguradora", "Vigencia", "Vencimento", "Status") VALUES ('AP-2025-237', 'Chilli Beans', 'Vidros e Fachadas', 'Allianz Seguros', '2025-07-08', '2026-07-08', 'Ativa');
INSERT INTO public."Apolices" (codigo_apolice, "Lojista", "Tipo", "Seguradora", "Vigencia", "Vencimento", "Status") VALUES ('AP-2025-249', 'Magazine Luiza', 'Incêndio', 'Bradesco Seguros', '2026-05-08', '2027-05-08', 'A Vencer');
INSERT INTO public."Apolices" (codigo_apolice, "Lojista", "Tipo", "Seguradora", "Vigencia", "Vencimento", "Status") VALUES ('AP-2024-312', 'Casas Bahia', 'Danos Elétricos', 'SulAmérica', '2024-05-20', '2025-04-20', 'Vencida');
INSERT INTO public."Apolices" (codigo_apolice, "Lojista", "Tipo", "Seguradora", "Vigencia", "Vencimento", "Status") VALUES ('AP-2025-261', 'Burger King', 'Responsabilidade Civil', 'Liberty Seguros', '2025-09-28', '2026-09-28', 'Ativa');
INSERT INTO public."Apolices" (codigo_apolice, "Lojista", "Tipo", "Seguradora", "Vigencia", "Vencimento", "Status") VALUES ('AP-2025-273', 'Starbucks', 'Alagamento e Infiltração', 'Mapfre Seguros', '2025-10-15', '2026-10-15', 'Ativa');
INSERT INTO public."Apolices" (codigo_apolice, "Lojista", "Tipo", "Seguradora", "Vigencia", "Vencimento", "Status") VALUES ('AP-2024-345', 'Ótica Moderna', 'Roubo e Furto', 'HDI Seguros', '2024-06-10', '2025-06-10', 'Vencida');
INSERT INTO public."Apolices" (codigo_apolice, "Lojista", "Tipo", "Seguradora", "Vigencia", "Vencimento", "Status") VALUES ('AP-2025-285', 'Apple Store', 'Equipamentos Eletrônicos', 'Porto Seguro', '2025-11-22', '2026-11-22', 'Ativa');
INSERT INTO public."Apolices" (codigo_apolice, "Lojista", "Tipo", "Seguradora", "Vigencia", "Vencimento", "Status") VALUES ('AP-2025-297', 'Le Biscuit', 'Incêndio', 'Zurich Seguros', '2026-01-28', '2027-01-28', 'Ativa');
INSERT INTO public."Apolices" (codigo_apolice, "Lojista", "Tipo", "Seguradora", "Vigencia", "Vencimento", "Status") VALUES ('AP-2024-378', 'Imaginarium', 'Vidros e Fachadas', 'Tokio Marine', '2024-07-18', '2025-07-18', 'Vencida');
INSERT INTO public."Apolices" (codigo_apolice, "Lojista", "Tipo", "Seguradora", "Vigencia", "Vencimento", "Status") VALUES ('AP-2025-309', 'Saraiva', 'Danos Elétricos', 'Allianz Seguros', '2025-12-05', '2026-12-05', 'Ativa');


--
-- TOC entry 4858 (class 2606 OID 16395)
-- Name: Apolices Apólices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Apolices"
    ADD CONSTRAINT "Apólices_pkey" PRIMARY KEY (codigo_apolice);


-- Completed on 2026-05-08 14:48:41

--
-- PostgreSQL database dump complete
--



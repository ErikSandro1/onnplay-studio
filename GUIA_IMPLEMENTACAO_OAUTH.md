_Gerado por Manus AI em 02 de janeiro de 2026_

# Guia de Implementação OAuth para Plataformas de Streaming

## Introdução

Este documento detalha os requisitos e os passos necessários para implementar a autenticação via OAuth para as principais plataformas de streaming (Twitch, Facebook, Instagram e TikTok) no OnnPlay Studio. O objetivo é permitir que os usuários conectem suas contas de forma segura e automática, similar à funcionalidade do StreamYard.

## Requisitos Gerais

Para cada plataforma, é necessário criar um "App" ou "Aplicação" em seu respectivo portal de desenvolvedores. Este processo gera as credenciais (Client ID/Key e Client Secret) que o OnnPlay Studio usará para autenticar os usuários.

A **URL de Redirecionamento (Redirect URI)** é um componente crítico. Ela informa à plataforma para onde o usuário deve ser enviado após a autorização. Para o OnnPlay Studio, as URLs já estão padronizadas no código-fonte.

---

## 1. Twitch

A integração com o Twitch já possui o código-fonte preparado no servidor, necessitando apenas da criação do aplicativo e da configuração das credenciais.

| Item | Onde Obter |
| :--- | :--- |
| **Portal de Desenvolvedores** | [dev.twitch.tv/console](https://dev.twitch.tv/console) |
| **Client ID** | Gerado no momento do registro do app |
| **Client Secret** | Gerado no momento do registro do app |
| **Redirect URI** | `https://www.onnplay.com/api/twitch/oauth/callback` |
| **Scopes (Permissões)** | `chat:read`, `chat:edit`, `channel:read:stream_key` |

### Passos para Configuração:

1.  Acesse o [Console de Desenvolvedores do Twitch](https://dev.twitch.tv/console).
2.  Clique em **"Register Your Application"**.
3.  Preencha os seguintes campos:
    *   **Name:** `OnnPlay Studio`
    *   **OAuth Redirect URL:** `https://www.onnplay.com/api/twitch/oauth/callback`
    *   **Category:** `Broadcasting Suite`
4.  Após o registro, copie o **Client ID** e gere um **Client Secret**.
5.  Adicione essas credenciais ao arquivo `.env` no servidor de produção.

---

## 2. Facebook & Instagram

Facebook e Instagram compartilham a mesma plataforma de desenvolvedores e, em muitos casos, o mesmo aplicativo. A implementação requer a criação de um app na Meta for Developers e a subsequente implementação do código no servidor.

| Item | Onde Obter |
| :--- | :--- |
| **Portal de Desenvolvedores** | [developers.facebook.com](https://developers.facebook.com) |
| **App ID** | Gerado no momento do registro do app |
| **App Secret** | Gerado no momento do registro do app |
| **Redirect URI** | `https://www.onnplay.com/api/facebook/oauth/callback` |
| **Permissões (Scopes)** | `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_manage_comments` |

### Passos para Configuração:

1.  Acesse o portal [Meta for Developers](https://developers.facebook.com).
2.  Crie um novo App do tipo **"Business"**.
3.  No painel do app, adicione os produtos **"Facebook Login"** e **"Instagram Basic Display"**.
4.  Configure a URL de redirecionamento OAuth nas configurações do produto "Facebook Login".
5.  **Submissão para Revisão:** Para que o aplicativo funcione para usuários além do administrador, ele precisa ser submetido para revisão pela Meta. Este processo pode levar alguns dias e exige que a aplicação demonstre o uso correto das permissões solicitadas.

---

## 3. TikTok

A integração com o TikTok é a mais complexa, pois o acesso às APIs de Live Streaming é restrito e requer uma aprovação rigorosa por parte da plataforma.

| Item | Onde Obter |
| :--- | :--- |
| **Portal de Desenvolvedores** | [developers.tiktok.com](https://developers.tiktok.com) |
| **Client Key (App Key)** | Gerado no momento do registro do app |
| **Client Secret (App Secret)** | Gerado no momento do registro do app |
| **Redirect URI** | `https://www.onnplay.com/api/tiktok/oauth/callback` |
| **Permissões (Scopes)** | `user.info.basic`, `video.list` (e permissões de Live, se aprovado) |

### Passos para Configuração:

1.  Acesse o [Portal de Desenvolvedores do TikTok](https://developers.tiktok.com).
2.  Crie uma conta de desenvolvedor e registre um novo aplicativo.
3.  Solicite acesso às APIs de Live. Este é um processo manual que envolve justificar a necessidade de acesso e pode não ser aprovado.
4.  Configure a URL de redirecionamento e outras informações do aplicativo.

---

## Resumo e Próximos Passos

A tabela abaixo resume o status atual da implementação de cada plataforma no OnnPlay Studio.

| Plataforma | Status Atual | Ação Imediata Necessária |
| :--- | :--- | :--- |
| **YouTube** | ✅ **Concluído** | Nenhuma. A integração está funcional. |
| **Twitch** | 🔧 **Código Pronto** | Criar o aplicativo no console do Twitch e adicionar as credenciais. |
| **Facebook** | ⏳ **Pendente** | Criar o aplicativo na Meta e desenvolver o código de integração no servidor. |
| **Instagram** | ⏳ **Pendente** | Utiliza o mesmo aplicativo do Facebook, mas requer desenvolvimento específico. |
| **TikTok** | ⏳ **Pendente** | Criar o aplicativo, solicitar aprovação para a API de Live e desenvolver a integração. |

Recomenda-se iniciar pela implementação do **Twitch**, devido à simplicidade do processo de aprovação e ao fato de que o código-fonte do lado do servidor já está preparado.

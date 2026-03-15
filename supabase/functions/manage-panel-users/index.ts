import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type PanelRole = "owner" | "editor";

type AllowlistRow = {
  id: string;
  email: string;
  role: PanelRole;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type RequestPayload = {
  id?: string | null;
  email?: string | null;
  password?: string | null;
  role?: PanelRole | null;
  active?: boolean | null;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isPanelRole(value: string): value is PanelRole {
  return value === "owner" || value === "editor";
}

async function listAllAuthUsers(adminClient: ReturnType<typeof createClient>) {
  const users: Array<{ id: string; email?: string | null }> = [];
  let page = 1;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 1000
    });

    if (error) {
      throw error;
    }

    const currentUsers = data?.users || [];
    users.push(...currentUsers);

    if (currentUsers.length < 1000) {
      break;
    }

    page += 1;
  }

  return users;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Método não permitido." }, 405);
  }

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse({ error: "Secrets do Supabase não configurados nesta Function." }, 500);
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Sessão inválida para chamar esta função." }, 401);
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authorization
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const accessToken = authorization.replace(/^Bearer\s+/i, "").trim();
  const {
    data: { user },
    error: userError
  } = await userClient.auth.getUser(accessToken);

  if (userError || !user?.email) {
    return jsonResponse({ error: "Não foi possível validar a sessão do usuário atual." }, 401);
  }

  const callerEmail = normalizeEmail(user.email);
  const { data: ownerRow, error: ownerError } = await adminClient
    .from("admin_allowlist")
    .select("id,email,role,active,created_at,updated_at")
    .eq("email", callerEmail)
    .eq("role", "owner")
    .eq("active", true)
    .maybeSingle<AllowlistRow>();

  if (ownerError) {
    return jsonResponse({ error: "Não foi possível confirmar a permissão do dono do painel." }, 500);
  }

  if (!ownerRow) {
    return jsonResponse({ error: "Apenas o dono do painel pode criar ou alterar usuários." }, 403);
  }

  let payload: RequestPayload;
  try {
    payload = (await request.json()) as RequestPayload;
  } catch {
    return jsonResponse({ error: "Corpo da requisição inválido." }, 400);
  }

  const email = normalizeEmail(String(payload.email || ""));
  const password = String(payload.password || "");
  const role = String(payload.role || "editor");
  const active = Boolean(payload.active);
  const allowlistId = String(payload.id || "").trim();

  if (!email) {
    return jsonResponse({ error: "Informe o e-mail que deve ser autorizado." }, 400);
  }

  if (!isPanelRole(role)) {
    return jsonResponse({ error: "Papel inválido para este acesso." }, 400);
  }

  if (callerEmail === email && (!active || role !== "owner")) {
    return jsonResponse({ error: "O dono atual do painel não pode remover o próprio acesso." }, 400);
  }

  const { data: existingAllowlistRow, error: allowlistLookupError } = await adminClient
    .from("admin_allowlist")
    .select("id,email,role,active,created_at,updated_at")
    .or(
      [allowlistId ? `id.eq.${allowlistId}` : null, `email.eq.${email}`]
        .filter(Boolean)
        .join(",")
    )
    .limit(1)
    .maybeSingle<AllowlistRow>();

  if (allowlistLookupError) {
    return jsonResponse({ error: "Não foi possível consultar a lista de e-mails permitidos." }, 500);
  }

  let authUsers: Array<{ id: string; email?: string | null }> = [];
  try {
    authUsers = await listAllAuthUsers(adminClient);
  } catch {
    return jsonResponse({ error: "Não foi possível consultar os usuários de autenticação." }, 500);
  }

  const previousEmail = existingAllowlistRow ? normalizeEmail(existingAllowlistRow.email) : "";
  const existingAuthUser =
    authUsers.find((entry) => normalizeEmail(String(entry.email || "")) === email) ||
    (previousEmail && previousEmail !== email
      ? authUsers.find((entry) => normalizeEmail(String(entry.email || "")) === previousEmail)
      : undefined);

  if (!existingAuthUser && !password) {
    return jsonResponse(
      { error: "Defina uma senha para criar um novo usuário do painel." },
      400
    );
  }

  if (password && password.length < 6) {
    return jsonResponse(
      { error: "A senha precisa ter pelo menos 6 caracteres." },
      400
    );
  }

  if (existingAuthUser) {
    const updatePayload: Record<string, unknown> = {
      email,
      email_confirm: true,
      app_metadata: {
        panel_role: role
      }
    };

    if (password) {
      updatePayload.password = password;
    }

    const { error: updateUserError } = await adminClient.auth.admin.updateUserById(
      existingAuthUser.id,
      updatePayload
    );

    if (updateUserError) {
      return jsonResponse(
        { error: `Não foi possível atualizar a conta deste e-mail: ${updateUserError.message}` },
        400
      );
    }
  } else {
    const { error: createUserError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: {
        panel_role: role
      }
    });

    if (createUserError) {
      return jsonResponse(
        { error: `Não foi possível criar a conta deste e-mail: ${createUserError.message}` },
        400
      );
    }
  }

  const { error: upsertError } = await adminClient.from("admin_allowlist").upsert(
    {
      id: existingAllowlistRow?.id || allowlistId || crypto.randomUUID(),
      email,
      role,
      active
    },
    {
      onConflict: "id"
    }
  );

  if (upsertError) {
    return jsonResponse(
      { error: `Não foi possível salvar a permissão deste e-mail: ${upsertError.message}` },
      400
    );
  }

  const { data: savedEntry, error: savedEntryError } = await adminClient
    .from("admin_allowlist")
    .select("id,email,role,active,created_at,updated_at")
    .eq("email", email)
    .limit(1)
    .single<AllowlistRow>();

  if (savedEntryError || !savedEntry) {
    return jsonResponse(
      { error: "A conta foi criada, mas não foi possível retornar o acesso salvo." },
      500
    );
  }

  return jsonResponse({
    entry: {
      id: savedEntry.id,
      email: normalizeEmail(savedEntry.email),
      role: savedEntry.role,
      active: savedEntry.active,
      createdAt: savedEntry.created_at,
      updatedAt: savedEntry.updated_at
    }
  });
});

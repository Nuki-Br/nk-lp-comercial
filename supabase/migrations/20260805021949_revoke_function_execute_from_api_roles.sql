-- Stage 2 · 5 — close a hole the previous migration only thought it had closed.
--
-- WHAT WENT WRONG. Migration 4 said "EXECUTE revoked from PUBLIC, granted only
-- to service_role" and did exactly that. It was not enough, and the proof is a
-- real response from this database:
--
--   POST /rest/v1/rpc/record_view_flush with the publishable key
--   -> 42501 "permission denied for table proposal_view_sessions"
--
-- Read that error carefully. anon was refused by the TABLE, which means it had
-- already been allowed to EXECUTE the function and enter its body. If the revoke
-- had covered anon, the refusal would have named the function instead.
--
-- The cause is that Supabase's default privileges grant EXECUTE on new functions
-- to anon and authenticated EXPLICITLY, not merely through PUBLIC. Revoking from
-- PUBLIC does not remove an explicit grant, so the function stayed callable.
--
-- SECURITY INVOKER is what contained it: the function has no privileges of its
-- own, so anon calling it still could not touch a table anon cannot read. That
-- is defense in depth doing its job, and it is not a reason to leave the outer
-- door open — an attacker who can enter a function body can probe for one that
-- is less careful.

revoke execute on function public.record_view_flush(uuid, integer, integer, jsonb) from anon;
revoke execute on function public.record_view_flush(uuid, integer, integer, jsonb) from authenticated;

-- Same class of hole, no practical risk: calling a trigger function directly
-- raises "trigger functions can only be called as triggers". Revoked anyway,
-- because "harmless today" is how the next one gets missed.
revoke execute on function public.set_updated_at() from anon;
revoke execute on function public.set_updated_at() from authenticated;

-- Verify after applying. The publishable key must now be refused by the
-- FUNCTION, not by a table it reached from inside:
--
--   curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/record_view_flush" \
--     -H "apikey: $SUPABASE_PUBLISHABLE_KEY" \
--     -H "Content-Type: application/json" -d '{"p_session_id":"00000000-0000-0000-0000-000000000000","p_seq":1,"p_active_ms_delta":0,"p_slides":[]}'
--
-- Expect PGRST202 (not found in the schema cache, because the role may not see
-- it) or 42501 naming the function. A 42501 naming a TABLE means this migration
-- did not take.

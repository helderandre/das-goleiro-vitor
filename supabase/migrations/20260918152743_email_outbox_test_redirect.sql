-- No modo de teste o histórico mostrava o endereço interno como destinatário,
-- como se o cliente fosse ele. recipient passa a ser sempre o cliente; o
-- desvio do modo de teste fica registrado à parte.
alter table public.email_outbox add column test_redirect_to text;

comment on column public.email_outbox.recipient is 'E-mail do cliente a quem o e-mail se destina.';
comment on column public.email_outbox.test_redirect_to is 'Endereço que de fato recebeu, quando enviado em modo de teste (EMAIL_TEST_RECIPIENT).';

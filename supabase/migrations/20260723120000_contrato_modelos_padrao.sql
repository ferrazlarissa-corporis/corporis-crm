-- Modelos de contrato padrão da Corporis (revisar com a assessoria jurídica antes de aplicar).
-- Idempotente: só insere se não existir modelo com o mesmo nome. Os campos {{...}} são mesclados
-- por src/lib/contrato/gerar.ts; {{objeto_plano}} e {{condicao_pagamento}} se adaptam ao tipo do plano
-- (fixo/personalizado/avulso), à periodicidade e à cobrança (única/parcelada).

insert into vendas.contrato_modelo (nome, corpo, pilares, planos, ativo)
select 'Pilates — prestação de serviços', $corpo$CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE PILATES
Pelo presente instrumento particular de contrato de prestação de serviços que celebram entre si as partes abaixo qualificadas:
CONTRATADA: Corporis Fisioterapia e Pilates Ltda, inscrita no CNPJ sob o nº 43.778.866/0001-30, com sede na Rua Coronel Santos Marinho, 347 – Sala 903 – Centro Médico Xanxerê, CEP 89820-000, Xanxerê – SC, neste ato representada por sua administradora Larissa Pacheco Ferraz, inscrita no CPF sob o nº 025.196.510-40, residente na cidade de Xanxerê – SC;
CONTRATANTE: {{cliente}}, CPF {{cpf}}, {{profissao}}, residente em {{endereco_cliente}}.

CLÁUSULA PRIMEIRA – DO OBJETO
1.1 – O presente instrumento tem por objeto a prestação de serviço de Pilates, por parte da CONTRATADA, com atividades individuais ou coletivas, oferecendo ao CONTRATANTE todos os recursos disponíveis para que este possa desenvolver suas capacidades físicas, atendendo às suas necessidades e contribuindo para uma melhor qualidade de vida.
1.2 – O CONTRATANTE declara estar apto à prática de atividade física e ciente de que deverá informar previamente ao profissional responsável qualquer condição de saúde, lesão, gestação ou limitação, preexistente ou superveniente, que possa influenciar na execução das atividades, respondendo pela veracidade das informações prestadas. O CONTRATANTE declara, ainda, não portar moléstia contagiosa que possa prejudicar os demais frequentadores da clínica.
1.3 – Quando o aluno for menor de idade, os pais ou responsáveis legais deverão assinar o contrato, respondendo solidariamente por seus atos ou omissões, renunciando ao benefício de ordem conferido pelo Código Civil.
1.4 – O serviço contratado é o {{objeto_plano}}.

CLÁUSULA SEGUNDA – DOS HONORÁRIOS
2.1 – O CONTRATANTE tem o direito de realizar as atividades contratadas após o pagamento dos honorários.
2.2 – Pela realização dos serviços ora contratados, o CONTRATANTE pagará à CONTRATADA {{condicao_pagamento}}.
2.3 – Forma de pagamento escolhida: {{forma_pagamento}}. Os pagamentos poderão ser realizados das seguintes formas:
a) Via PIX ou transferência bancária para conta de titularidade da CONTRATADA, chave PIX (CNPJ): 43.778.866/0001-30;
b) Via cartão de débito ou crédito.
2.4 – Em caso de inadimplemento após a data de vencimento, até a quitação final do valor contratado, incidirão sobre o valor em aberto: multa pecuniária de 2% (dois por cento), juros de mora de 1% (um por cento) ao mês e correção monetária pelo IGP-M/FGV. Se o prazo de inadimplemento for superior a 60 (sessenta) dias, desde que esgotadas todas as formas de cobrança amigáveis, a CONTRATADA fica desde já autorizada a: incluir o nome do CONTRATANTE nos órgãos de proteção ao crédito (SPC/Serasa); emitir títulos de crédito contra o CONTRATANTE; e ajuizar a ação cabível.
Parágrafo único: Em caso de cobrança judicial, serão acrescidas as custas processuais e 20% (vinte por cento) do valor do contrato a título de honorários advocatícios, custeados pela parte cuja mora tenha ensejado a respectiva cobrança.
2.5 – O CONTRATANTE somente poderá frequentar as sessões se não houver qualquer débito em aberto.

CLÁUSULA TERCEIRA – DA RESCISÃO E PENALIDADES DECORRENTES
3.1 – Se o prazo de inadimplemento for superior a 60 (sessenta) dias, as sessões contratadas serão automaticamente canceladas e os horários liberados para novos contratantes.
3.2 – O CONTRATANTE que mantiver conduta em desacordo com o objeto deste instrumento, bem como conduta contrária à moral e aos bons costumes, estará sujeito à advertência verbal e/ou por escrito. Em caso de reincidência, terá o contrato rescindido antecipadamente a critério da CONTRATADA, sem prejuízo da apuração de perdas e danos.
3.3 – O presente contrato poderá ser rescindido por qualquer das partes, desde que a parte interessada comunique a outra, por escrito, com 30 (trinta) dias de antecedência.
3.4 – No caso de o CONTRATANTE rescindir o contrato antecipadamente e sem justa causa, a CONTRATADA fará jus ao recebimento de multa de 10% (dez por cento) sobre o valor total restante a pagar do contrato. Caso o pagamento tenha sido feito de maneira antecipada, a CONTRATADA restituirá ao CONTRATANTE o valor das sessões remanescentes, deduzida a referida multa.
3.5 – No caso de a CONTRATADA rescindir o contrato antecipadamente e sem justa causa, e tendo o pagamento sido feito de maneira antecipada, o CONTRATANTE terá o valor das sessões remanescentes restituído, acrescido de multa de 10% (dez por cento) sobre o valor dessas sessões, no prazo de até 7 (sete) dias contados da data da rescisão.
3.6 – Não incidirá qualquer multa rescisória nas hipóteses de rescisão por justa causa, assim consideradas, entre outras: (i) impedimento médico comprovado para a prática de atividade física, mediante apresentação de atestado; (ii) mudança comprovada de município de residência do CONTRATANTE; e (iii) demais hipóteses de caso fortuito ou força maior. Nesses casos, havendo pagamento antecipado, será restituído ao CONTRATANTE o valor proporcional das sessões não usufruídas, sem qualquer penalidade.
3.7 – Da suspensão (congelamento) do plano: o CONTRATANTE poderá solicitar a suspensão temporária do plano por período de até 30 (trinta) dias, mediante comprovação de motivo justificado (tais como lesão, gestação ou viagem), ficando a vigência do contrato automaticamente prorrogada pelo mesmo período da suspensão, a fim de preservar a realização integral das sessões contratadas.

CLÁUSULA QUARTA – DAS DISPOSIÇÕES GERAIS
4.1 – O CONTRATANTE terá a opção de escolha do horário da sessão de Pilates conforme disponibilidade e respeitando o limite de até 3 (três) alunos por horário.
4.2 – O CONTRATANTE tem o direito de reagendar até 25% (vinte e cinco por cento) das sessões contratadas, observado o prazo mínimo de 3 (três) horas de antecedência para o aviso da impossibilidade de comparecimento no horário preestabelecido.
4.3 – Se, decorridos 10 (dez) minutos do horário agendado, o CONTRATANTE não comparecer à sessão e não avisar previamente conforme estabelecido no item anterior, não terá direito à reposição da sessão.
4.4 – A CONTRATADA não funcionará em feriados oficiais. As sessões que coincidirem com feriados serão repostas em outro horário disponível, dentro da vigência do contrato, sem custo adicional ao CONTRATANTE, de modo a preservar a integralidade das sessões contratadas.
4.5 – Poderá o CONTRATANTE reagendar sessão em caso de falecimento de parente até o 3º (terceiro) grau, sem utilizar o direito disposto no item 4.2.
4.6 – Quando o CONTRATANTE não comparecer a uma sessão de reposição, este não terá direito a nova reposição.
4.7 – Todas as hipóteses de reposição de sessões só poderão ser realizadas durante a vigência do contrato.
4.8 – O presente contrato é firmado em caráter individual e intransferível na pessoa do CONTRATANTE.
4.9 – A CONTRATADA poderá efetuar as alterações que se fizerem necessárias nos horários dos profissionais ou das sessões, desde que comunique o CONTRATANTE com antecedência mínima de 3 (três) horas.
4.10 – O CONTRATANTE deverá zelar e utilizar adequadamente os equipamentos e bens móveis da CONTRATADA. Caso a má utilização venha a causar danos, ficará o CONTRATANTE obrigado a repará-los.
4.11 – A tolerância, por qualquer das partes, com relação ao descumprimento de qualquer termo ou condição aqui ajustado não será considerada como desistência em exigir o cumprimento da disposição, nem representará novação com relação à obrigação passada, presente ou futura.

CLÁUSULA QUINTA – DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)
5.1 – As partes se comprometem a tratar os dados pessoais coletados em razão deste contrato em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados – LGPD).
5.2 – O CONTRATANTE autoriza a CONTRATADA a coletar e tratar seus dados pessoais e dados pessoais sensíveis referentes à saúde, quando aplicável, exclusivamente para as finalidades de execução do presente contrato, prestação adequada e segura do serviço, cumprimento de obrigações legais e regulatórias e exercício regular de direitos.
5.3 – A CONTRATADA compromete-se a não compartilhar os dados do CONTRATANTE com terceiros, salvo quando necessário à execução do contrato, por determinação legal ou por ordem de autoridade competente, adotando medidas técnicas e administrativas para proteção dos dados.
5.4 – É assegurado ao CONTRATANTE, na qualidade de titular, o exercício dos direitos previstos no art. 18 da LGPD, incluindo confirmação, acesso, correção e eliminação de dados. As solicitações e comunicações poderão ser dirigidas ao encarregado pelo tratamento de dados, pelo e-mail: {{clinica_email}}.
5.5 – Os dados serão mantidos pelo prazo necessário ao cumprimento das finalidades acima e dos prazos legais aplicáveis, sendo posteriormente eliminados ou anonimizados.

CLÁUSULA SEXTA – DO FORO DE ELEIÇÃO
6.1 – Para dirimir qualquer litígio decorrente do presente contrato, fica eleito o Foro da Comarca de Xanxerê, Estado de Santa Catarina, ressalvado, nas relações de consumo, o direito do CONTRATANTE de optar pelo foro de seu domicílio, nos termos da legislação vigente.

Por estarem assim justas e contratadas, as partes assinam o presente contrato, que reconhecem como válido e vinculante, valendo o presente como título executivo extrajudicial, nos termos do art. 784 do Código de Processo Civil.

Xanxerê, {{data}}.

CONTRATADA

______________________________________
Corporis Fisioterapia e Pilates Ltda
Larissa Pacheco Ferraz – Administradora

CONTRATANTE

______________________________________
{{cliente}}
CPF {{cpf}}$corpo$, '["pilates"]'::jsonb, '[]'::jsonb, true
where not exists (select 1 from vendas.contrato_modelo where nome = 'Pilates — prestação de serviços');

insert into vendas.contrato_modelo (nome, corpo, pilares, planos, ativo)
select 'Fisioterapia Pélvica — prestação de serviços', $corpo$CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE FISIOTERAPIA PÉLVICA
Pelo presente instrumento particular de contrato de prestação de serviços que celebram entre si as partes abaixo qualificadas:
CONTRATADA: Corporis Fisioterapia e Pilates Ltda, inscrita no CNPJ sob o nº 43.778.866/0001-30, com sede na Rua Coronel Santos Marinho, 347 – Sala 903 – Centro Médico Xanxerê, CEP 89820-000, Xanxerê – SC, neste ato representada por sua administradora Larissa Pacheco Ferraz, inscrita no CPF sob o nº 025.196.510-40, residente na cidade de Xanxerê – SC;
CONTRATANTE: {{cliente}}, CPF {{cpf}}, {{profissao}}, residente em {{endereco_cliente}}.

CLÁUSULA PRIMEIRA – DO OBJETO
1.1 – O presente instrumento tem por objeto a prestação de serviços de Fisioterapia Pélvica, por parte da CONTRATADA, por meio de profissional habilitada, com atendimentos individuais, conduzidos de forma discreta e respeitosa, a partir da avaliação individual do CONTRATANTE. A CONTRATADA assume obrigação de meio, empregando a técnica e o cuidado adequados ao caso, sem garantia de resultado específico ou de prazo para sua obtenção.
1.2 – O CONTRATANTE declara ter prestado informações verdadeiras sobre sua saúde e ciente de que deverá informar previamente à profissional responsável qualquer condição de saúde, lesão, gestação, uso de medicamentos ou limitação, preexistente ou superveniente, que possa influenciar na execução dos atendimentos, respondendo pela veracidade das informações prestadas. O CONTRATANTE declara, ainda, não portar moléstia contagiosa que possa prejudicar terceiros.
1.3 – Quando o aluno for menor de idade, os pais ou responsáveis legais deverão assinar o contrato, respondendo solidariamente por seus atos ou omissões, renunciando ao benefício de ordem conferido pelo Código Civil.
1.4 – O serviço contratado é o {{objeto_plano}}.
1.5 – Os atendimentos serão precedidos de avaliação individual, e a conduta será definida pela profissional responsável. Os atendimentos são individuais e sigilosos.

CLÁUSULA SEGUNDA – DOS HONORÁRIOS
2.1 – O CONTRATANTE tem o direito de realizar as atividades contratadas após o pagamento dos honorários.
2.2 – Pela realização dos serviços ora contratados, o CONTRATANTE pagará à CONTRATADA {{condicao_pagamento}}.
2.3 – Forma de pagamento escolhida: {{forma_pagamento}}. Os pagamentos poderão ser realizados das seguintes formas:
a) Via PIX ou transferência bancária para conta de titularidade da CONTRATADA, chave PIX (CNPJ): 43.778.866/0001-30;
b) Via cartão de débito ou crédito.
2.4 – Em caso de inadimplemento após a data de vencimento, até a quitação final do valor contratado, incidirão sobre o valor em aberto: multa pecuniária de 2% (dois por cento), juros de mora de 1% (um por cento) ao mês e correção monetária pelo IGP-M/FGV. Se o prazo de inadimplemento for superior a 60 (sessenta) dias, desde que esgotadas todas as formas de cobrança amigáveis, a CONTRATADA fica desde já autorizada a: incluir o nome do CONTRATANTE nos órgãos de proteção ao crédito (SPC/Serasa); emitir títulos de crédito contra o CONTRATANTE; e ajuizar a ação cabível.
Parágrafo único: Em caso de cobrança judicial, serão acrescidas as custas processuais e 20% (vinte por cento) do valor do contrato a título de honorários advocatícios, custeados pela parte cuja mora tenha ensejado a respectiva cobrança.
2.5 – O CONTRATANTE somente poderá frequentar as sessões se não houver qualquer débito em aberto.

CLÁUSULA TERCEIRA – DA RESCISÃO E PENALIDADES DECORRENTES
3.1 – Se o prazo de inadimplemento for superior a 60 (sessenta) dias, as sessões contratadas serão automaticamente canceladas e os horários liberados para novos contratantes.
3.2 – O CONTRATANTE que mantiver conduta em desacordo com o objeto deste instrumento, bem como conduta contrária à moral e aos bons costumes, estará sujeito à advertência verbal e/ou por escrito. Em caso de reincidência, terá o contrato rescindido antecipadamente a critério da CONTRATADA, sem prejuízo da apuração de perdas e danos.
3.3 – O presente contrato poderá ser rescindido por qualquer das partes, desde que a parte interessada comunique a outra, por escrito, com 30 (trinta) dias de antecedência.
3.4 – No caso de o CONTRATANTE rescindir o contrato antecipadamente e sem justa causa, a CONTRATADA fará jus ao recebimento de multa de 10% (dez por cento) sobre o valor total restante a pagar do contrato. Caso o pagamento tenha sido feito de maneira antecipada, a CONTRATADA restituirá ao CONTRATANTE o valor das sessões remanescentes, deduzida a referida multa.
3.5 – No caso de a CONTRATADA rescindir o contrato antecipadamente e sem justa causa, e tendo o pagamento sido feito de maneira antecipada, o CONTRATANTE terá o valor das sessões remanescentes restituído, acrescido de multa de 10% (dez por cento) sobre o valor dessas sessões, no prazo de até 7 (sete) dias contados da data da rescisão.
3.6 – Não incidirá qualquer multa rescisória nas hipóteses de rescisão por justa causa, assim consideradas, entre outras: (i) impedimento médico comprovado para a prática de atividade física, mediante apresentação de atestado; (ii) mudança comprovada de município de residência do CONTRATANTE; e (iii) demais hipóteses de caso fortuito ou força maior. Nesses casos, havendo pagamento antecipado, será restituído ao CONTRATANTE o valor proporcional das sessões não usufruídas, sem qualquer penalidade.
3.7 – Da suspensão (congelamento) do plano: o CONTRATANTE poderá solicitar a suspensão temporária do plano por período de até 30 (trinta) dias, mediante comprovação de motivo justificado (tais como lesão, gestação ou viagem), ficando a vigência do contrato automaticamente prorrogada pelo mesmo período da suspensão, a fim de preservar a realização integral das sessões contratadas.

CLÁUSULA QUARTA – DAS DISPOSIÇÕES GERAIS
4.1 – Os atendimentos são individuais e o horário será escolhido conforme a disponibilidade da agenda da profissional responsável.
4.2 – O CONTRATANTE tem o direito de reagendar até 25% (vinte e cinco por cento) das sessões contratadas, observado o prazo mínimo de 3 (três) horas de antecedência para o aviso da impossibilidade de comparecimento no horário preestabelecido.
4.3 – Se, decorridos 10 (dez) minutos do horário agendado, o CONTRATANTE não comparecer à sessão e não avisar previamente conforme estabelecido no item anterior, não terá direito à reposição da sessão.
4.4 – A CONTRATADA não funcionará em feriados oficiais. As sessões que coincidirem com feriados serão repostas em outro horário disponível, dentro da vigência do contrato, sem custo adicional ao CONTRATANTE, de modo a preservar a integralidade das sessões contratadas.
4.5 – Poderá o CONTRATANTE reagendar sessão em caso de falecimento de parente até o 3º (terceiro) grau, sem utilizar o direito disposto no item 4.2.
4.6 – Quando o CONTRATANTE não comparecer a uma sessão de reposição, este não terá direito a nova reposição.
4.7 – Todas as hipóteses de reposição de sessões só poderão ser realizadas durante a vigência do contrato.
4.8 – O presente contrato é firmado em caráter individual e intransferível na pessoa do CONTRATANTE.
4.9 – A CONTRATADA poderá efetuar as alterações que se fizerem necessárias nos horários dos profissionais ou das sessões, desde que comunique o CONTRATANTE com antecedência mínima de 3 (três) horas.
4.10 – O CONTRATANTE deverá zelar e utilizar adequadamente os equipamentos e bens móveis da CONTRATADA. Caso a má utilização venha a causar danos, ficará o CONTRATANTE obrigado a repará-los.
4.11 – A tolerância, por qualquer das partes, com relação ao descumprimento de qualquer termo ou condição aqui ajustado não será considerada como desistência em exigir o cumprimento da disposição, nem representará novação com relação à obrigação passada, presente ou futura.

CLÁUSULA QUINTA – DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)
5.1 – As partes se comprometem a tratar os dados pessoais coletados em razão deste contrato em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados – LGPD).
5.2 – O CONTRATANTE autoriza a CONTRATADA a coletar e tratar seus dados pessoais e dados pessoais sensíveis referentes à saúde, quando aplicável, exclusivamente para as finalidades de execução do presente contrato, prestação adequada e segura do serviço, cumprimento de obrigações legais e regulatórias e exercício regular de direitos.
5.3 – A CONTRATADA compromete-se a não compartilhar os dados do CONTRATANTE com terceiros, salvo quando necessário à execução do contrato, por determinação legal ou por ordem de autoridade competente, adotando medidas técnicas e administrativas para proteção dos dados.
5.4 – É assegurado ao CONTRATANTE, na qualidade de titular, o exercício dos direitos previstos no art. 18 da LGPD, incluindo confirmação, acesso, correção e eliminação de dados. As solicitações e comunicações poderão ser dirigidas ao encarregado pelo tratamento de dados, pelo e-mail: {{clinica_email}}.
5.5 – Os dados serão mantidos pelo prazo necessário ao cumprimento das finalidades acima e dos prazos legais aplicáveis, sendo posteriormente eliminados ou anonimizados.

CLÁUSULA SEXTA – DO FORO DE ELEIÇÃO
6.1 – Para dirimir qualquer litígio decorrente do presente contrato, fica eleito o Foro da Comarca de Xanxerê, Estado de Santa Catarina, ressalvado, nas relações de consumo, o direito do CONTRATANTE de optar pelo foro de seu domicílio, nos termos da legislação vigente.

Por estarem assim justas e contratadas, as partes assinam o presente contrato, que reconhecem como válido e vinculante, valendo o presente como título executivo extrajudicial, nos termos do art. 784 do Código de Processo Civil.

Xanxerê, {{data}}.

CONTRATADA

______________________________________
Corporis Fisioterapia e Pilates Ltda
Larissa Pacheco Ferraz – Administradora

CONTRATANTE

______________________________________
{{cliente}}
CPF {{cpf}}$corpo$, '["fisio_pelvica"]'::jsonb, '[]'::jsonb, true
where not exists (select 1 from vendas.contrato_modelo where nome = 'Fisioterapia Pélvica — prestação de serviços');

insert into vendas.contrato_modelo (nome, corpo, pilares, planos, ativo)
select 'Acupuntura — prestação de serviços', $corpo$CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE ACUPUNTURA
Pelo presente instrumento particular de contrato de prestação de serviços que celebram entre si as partes abaixo qualificadas:
CONTRATADA: Corporis Fisioterapia e Pilates Ltda, inscrita no CNPJ sob o nº 43.778.866/0001-30, com sede na Rua Coronel Santos Marinho, 347 – Sala 903 – Centro Médico Xanxerê, CEP 89820-000, Xanxerê – SC, neste ato representada por sua administradora Larissa Pacheco Ferraz, inscrita no CPF sob o nº 025.196.510-40, residente na cidade de Xanxerê – SC;
CONTRATANTE: {{cliente}}, CPF {{cpf}}, {{profissao}}, residente em {{endereco_cliente}}.

CLÁUSULA PRIMEIRA – DO OBJETO
1.1 – O presente instrumento tem por objeto a prestação de serviços de Acupuntura, por parte da CONTRATADA, por meio de profissional habilitada, com atendimentos individuais, a partir da avaliação individual do CONTRATANTE. A CONTRATADA assume obrigação de meio, empregando a técnica e o cuidado adequados ao caso, sem garantia de resultado específico ou de prazo para sua obtenção.
1.2 – O CONTRATANTE declara ter prestado informações verdadeiras sobre sua saúde e ciente de que deverá informar previamente à profissional responsável qualquer condição de saúde, gestação, uso de medicamentos ou anticoagulantes, alergias ou limitação, preexistente ou superveniente, que possa influenciar na execução dos atendimentos, respondendo pela veracidade das informações prestadas. O CONTRATANTE declara, ainda, não portar moléstia contagiosa que possa prejudicar terceiros.
1.3 – Quando o aluno for menor de idade, os pais ou responsáveis legais deverão assinar o contrato, respondendo solidariamente por seus atos ou omissões, renunciando ao benefício de ordem conferido pelo Código Civil.
1.4 – O serviço contratado é o {{objeto_plano}}.
1.5 – Os atendimentos serão precedidos de avaliação individual, e a conduta será definida pela profissional responsável. Os materiais perfurocortantes utilizados são descartáveis e de uso exclusivo do CONTRATANTE.

CLÁUSULA SEGUNDA – DOS HONORÁRIOS
2.1 – O CONTRATANTE tem o direito de realizar as atividades contratadas após o pagamento dos honorários.
2.2 – Pela realização dos serviços ora contratados, o CONTRATANTE pagará à CONTRATADA {{condicao_pagamento}}.
2.3 – Forma de pagamento escolhida: {{forma_pagamento}}. Os pagamentos poderão ser realizados das seguintes formas:
a) Via PIX ou transferência bancária para conta de titularidade da CONTRATADA, chave PIX (CNPJ): 43.778.866/0001-30;
b) Via cartão de débito ou crédito.
2.4 – Em caso de inadimplemento após a data de vencimento, até a quitação final do valor contratado, incidirão sobre o valor em aberto: multa pecuniária de 2% (dois por cento), juros de mora de 1% (um por cento) ao mês e correção monetária pelo IGP-M/FGV. Se o prazo de inadimplemento for superior a 60 (sessenta) dias, desde que esgotadas todas as formas de cobrança amigáveis, a CONTRATADA fica desde já autorizada a: incluir o nome do CONTRATANTE nos órgãos de proteção ao crédito (SPC/Serasa); emitir títulos de crédito contra o CONTRATANTE; e ajuizar a ação cabível.
Parágrafo único: Em caso de cobrança judicial, serão acrescidas as custas processuais e 20% (vinte por cento) do valor do contrato a título de honorários advocatícios, custeados pela parte cuja mora tenha ensejado a respectiva cobrança.
2.5 – O CONTRATANTE somente poderá frequentar as sessões se não houver qualquer débito em aberto.

CLÁUSULA TERCEIRA – DA RESCISÃO E PENALIDADES DECORRENTES
3.1 – Se o prazo de inadimplemento for superior a 60 (sessenta) dias, as sessões contratadas serão automaticamente canceladas e os horários liberados para novos contratantes.
3.2 – O CONTRATANTE que mantiver conduta em desacordo com o objeto deste instrumento, bem como conduta contrária à moral e aos bons costumes, estará sujeito à advertência verbal e/ou por escrito. Em caso de reincidência, terá o contrato rescindido antecipadamente a critério da CONTRATADA, sem prejuízo da apuração de perdas e danos.
3.3 – O presente contrato poderá ser rescindido por qualquer das partes, desde que a parte interessada comunique a outra, por escrito, com 30 (trinta) dias de antecedência.
3.4 – No caso de o CONTRATANTE rescindir o contrato antecipadamente e sem justa causa, a CONTRATADA fará jus ao recebimento de multa de 10% (dez por cento) sobre o valor total restante a pagar do contrato. Caso o pagamento tenha sido feito de maneira antecipada, a CONTRATADA restituirá ao CONTRATANTE o valor das sessões remanescentes, deduzida a referida multa.
3.5 – No caso de a CONTRATADA rescindir o contrato antecipadamente e sem justa causa, e tendo o pagamento sido feito de maneira antecipada, o CONTRATANTE terá o valor das sessões remanescentes restituído, acrescido de multa de 10% (dez por cento) sobre o valor dessas sessões, no prazo de até 7 (sete) dias contados da data da rescisão.
3.6 – Não incidirá qualquer multa rescisória nas hipóteses de rescisão por justa causa, assim consideradas, entre outras: (i) impedimento médico comprovado para a prática de atividade física, mediante apresentação de atestado; (ii) mudança comprovada de município de residência do CONTRATANTE; e (iii) demais hipóteses de caso fortuito ou força maior. Nesses casos, havendo pagamento antecipado, será restituído ao CONTRATANTE o valor proporcional das sessões não usufruídas, sem qualquer penalidade.
3.7 – Da suspensão (congelamento) do plano: o CONTRATANTE poderá solicitar a suspensão temporária do plano por período de até 30 (trinta) dias, mediante comprovação de motivo justificado (tais como lesão, gestação ou viagem), ficando a vigência do contrato automaticamente prorrogada pelo mesmo período da suspensão, a fim de preservar a realização integral das sessões contratadas.

CLÁUSULA QUARTA – DAS DISPOSIÇÕES GERAIS
4.1 – Os atendimentos são individuais e o horário será escolhido conforme a disponibilidade da agenda da profissional responsável.
4.2 – O CONTRATANTE tem o direito de reagendar até 25% (vinte e cinco por cento) das sessões contratadas, observado o prazo mínimo de 3 (três) horas de antecedência para o aviso da impossibilidade de comparecimento no horário preestabelecido.
4.3 – Se, decorridos 10 (dez) minutos do horário agendado, o CONTRATANTE não comparecer à sessão e não avisar previamente conforme estabelecido no item anterior, não terá direito à reposição da sessão.
4.4 – A CONTRATADA não funcionará em feriados oficiais. As sessões que coincidirem com feriados serão repostas em outro horário disponível, dentro da vigência do contrato, sem custo adicional ao CONTRATANTE, de modo a preservar a integralidade das sessões contratadas.
4.5 – Poderá o CONTRATANTE reagendar sessão em caso de falecimento de parente até o 3º (terceiro) grau, sem utilizar o direito disposto no item 4.2.
4.6 – Quando o CONTRATANTE não comparecer a uma sessão de reposição, este não terá direito a nova reposição.
4.7 – Todas as hipóteses de reposição de sessões só poderão ser realizadas durante a vigência do contrato.
4.8 – O presente contrato é firmado em caráter individual e intransferível na pessoa do CONTRATANTE.
4.9 – A CONTRATADA poderá efetuar as alterações que se fizerem necessárias nos horários dos profissionais ou das sessões, desde que comunique o CONTRATANTE com antecedência mínima de 3 (três) horas.
4.10 – O CONTRATANTE deverá zelar e utilizar adequadamente os equipamentos e bens móveis da CONTRATADA. Caso a má utilização venha a causar danos, ficará o CONTRATANTE obrigado a repará-los.
4.11 – A tolerância, por qualquer das partes, com relação ao descumprimento de qualquer termo ou condição aqui ajustado não será considerada como desistência em exigir o cumprimento da disposição, nem representará novação com relação à obrigação passada, presente ou futura.

CLÁUSULA QUINTA – DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)
5.1 – As partes se comprometem a tratar os dados pessoais coletados em razão deste contrato em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados – LGPD).
5.2 – O CONTRATANTE autoriza a CONTRATADA a coletar e tratar seus dados pessoais e dados pessoais sensíveis referentes à saúde, quando aplicável, exclusivamente para as finalidades de execução do presente contrato, prestação adequada e segura do serviço, cumprimento de obrigações legais e regulatórias e exercício regular de direitos.
5.3 – A CONTRATADA compromete-se a não compartilhar os dados do CONTRATANTE com terceiros, salvo quando necessário à execução do contrato, por determinação legal ou por ordem de autoridade competente, adotando medidas técnicas e administrativas para proteção dos dados.
5.4 – É assegurado ao CONTRATANTE, na qualidade de titular, o exercício dos direitos previstos no art. 18 da LGPD, incluindo confirmação, acesso, correção e eliminação de dados. As solicitações e comunicações poderão ser dirigidas ao encarregado pelo tratamento de dados, pelo e-mail: {{clinica_email}}.
5.5 – Os dados serão mantidos pelo prazo necessário ao cumprimento das finalidades acima e dos prazos legais aplicáveis, sendo posteriormente eliminados ou anonimizados.

CLÁUSULA SEXTA – DO FORO DE ELEIÇÃO
6.1 – Para dirimir qualquer litígio decorrente do presente contrato, fica eleito o Foro da Comarca de Xanxerê, Estado de Santa Catarina, ressalvado, nas relações de consumo, o direito do CONTRATANTE de optar pelo foro de seu domicílio, nos termos da legislação vigente.

Por estarem assim justas e contratadas, as partes assinam o presente contrato, que reconhecem como válido e vinculante, valendo o presente como título executivo extrajudicial, nos termos do art. 784 do Código de Processo Civil.

Xanxerê, {{data}}.

CONTRATADA

______________________________________
Corporis Fisioterapia e Pilates Ltda
Larissa Pacheco Ferraz – Administradora

CONTRATANTE

______________________________________
{{cliente}}
CPF {{cpf}}$corpo$, '["acupuntura"]'::jsonb, '[]'::jsonb, true
where not exists (select 1 from vendas.contrato_modelo where nome = 'Acupuntura — prestação de serviços');

insert into vendas.contrato_modelo (nome, corpo, pilares, planos, ativo)
select 'Pacote misto — Pilates + Fisioterapia Pélvica', $corpo$CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE PILATES E FISIOTERAPIA PÉLVICA
Pelo presente instrumento particular de contrato de prestação de serviços que celebram entre si as partes abaixo qualificadas:
CONTRATADA: Corporis Fisioterapia e Pilates Ltda, inscrita no CNPJ sob o nº 43.778.866/0001-30, com sede na Rua Coronel Santos Marinho, 347 – Sala 903 – Centro Médico Xanxerê, CEP 89820-000, Xanxerê – SC, neste ato representada por sua administradora Larissa Pacheco Ferraz, inscrita no CPF sob o nº 025.196.510-40, residente na cidade de Xanxerê – SC;
CONTRATANTE: {{cliente}}, CPF {{cpf}}, {{profissao}}, residente em {{endereco_cliente}}.

CLÁUSULA PRIMEIRA – DO OBJETO
1.1 – O presente instrumento tem por objeto a prestação de serviços de Pilates e de Fisioterapia Pélvica, por parte da CONTRATADA. O Pilates é realizado com atividades individuais ou coletivas; a Fisioterapia Pélvica é realizada por meio de profissional habilitada, com atendimentos individuais, conduzidos de forma discreta e respeitosa, a partir da avaliação individual do CONTRATANTE. Quanto à Fisioterapia Pélvica, a CONTRATADA assume obrigação de meio, sem garantia de resultado específico ou de prazo para sua obtenção.
1.2 – O CONTRATANTE declara estar apto à prática de atividade física e ciente de que deverá informar previamente ao profissional responsável qualquer condição de saúde, lesão, gestação, uso de medicamentos ou limitação, preexistente ou superveniente, que possa influenciar na execução das atividades e dos atendimentos, respondendo pela veracidade das informações prestadas. O CONTRATANTE declara, ainda, não portar moléstia contagiosa que possa prejudicar os demais frequentadores da clínica.
1.3 – Quando o aluno for menor de idade, os pais ou responsáveis legais deverão assinar o contrato, respondendo solidariamente por seus atos ou omissões, renunciando ao benefício de ordem conferido pelo Código Civil.
1.4 – O serviço contratado é o {{objeto_plano}}.
1.5 – Os atendimentos de Fisioterapia Pélvica serão precedidos de avaliação individual, e a conduta será definida pela profissional responsável. Esses atendimentos são individuais e sigilosos.

CLÁUSULA SEGUNDA – DOS HONORÁRIOS
2.1 – O CONTRATANTE tem o direito de realizar as atividades contratadas após o pagamento dos honorários.
2.2 – Pela realização dos serviços ora contratados, o CONTRATANTE pagará à CONTRATADA {{condicao_pagamento}}.
2.3 – Forma de pagamento escolhida: {{forma_pagamento}}. Os pagamentos poderão ser realizados das seguintes formas:
a) Via PIX ou transferência bancária para conta de titularidade da CONTRATADA, chave PIX (CNPJ): 43.778.866/0001-30;
b) Via cartão de débito ou crédito.
2.4 – Em caso de inadimplemento após a data de vencimento, até a quitação final do valor contratado, incidirão sobre o valor em aberto: multa pecuniária de 2% (dois por cento), juros de mora de 1% (um por cento) ao mês e correção monetária pelo IGP-M/FGV. Se o prazo de inadimplemento for superior a 60 (sessenta) dias, desde que esgotadas todas as formas de cobrança amigáveis, a CONTRATADA fica desde já autorizada a: incluir o nome do CONTRATANTE nos órgãos de proteção ao crédito (SPC/Serasa); emitir títulos de crédito contra o CONTRATANTE; e ajuizar a ação cabível.
Parágrafo único: Em caso de cobrança judicial, serão acrescidas as custas processuais e 20% (vinte por cento) do valor do contrato a título de honorários advocatícios, custeados pela parte cuja mora tenha ensejado a respectiva cobrança.
2.5 – O CONTRATANTE somente poderá frequentar as sessões se não houver qualquer débito em aberto.

CLÁUSULA TERCEIRA – DA RESCISÃO E PENALIDADES DECORRENTES
3.1 – Se o prazo de inadimplemento for superior a 60 (sessenta) dias, as sessões contratadas serão automaticamente canceladas e os horários liberados para novos contratantes.
3.2 – O CONTRATANTE que mantiver conduta em desacordo com o objeto deste instrumento, bem como conduta contrária à moral e aos bons costumes, estará sujeito à advertência verbal e/ou por escrito. Em caso de reincidência, terá o contrato rescindido antecipadamente a critério da CONTRATADA, sem prejuízo da apuração de perdas e danos.
3.3 – O presente contrato poderá ser rescindido por qualquer das partes, desde que a parte interessada comunique a outra, por escrito, com 30 (trinta) dias de antecedência.
3.4 – No caso de o CONTRATANTE rescindir o contrato antecipadamente e sem justa causa, a CONTRATADA fará jus ao recebimento de multa de 10% (dez por cento) sobre o valor total restante a pagar do contrato. Caso o pagamento tenha sido feito de maneira antecipada, a CONTRATADA restituirá ao CONTRATANTE o valor das sessões remanescentes, deduzida a referida multa.
3.5 – No caso de a CONTRATADA rescindir o contrato antecipadamente e sem justa causa, e tendo o pagamento sido feito de maneira antecipada, o CONTRATANTE terá o valor das sessões remanescentes restituído, acrescido de multa de 10% (dez por cento) sobre o valor dessas sessões, no prazo de até 7 (sete) dias contados da data da rescisão.
3.6 – Não incidirá qualquer multa rescisória nas hipóteses de rescisão por justa causa, assim consideradas, entre outras: (i) impedimento médico comprovado para a prática de atividade física, mediante apresentação de atestado; (ii) mudança comprovada de município de residência do CONTRATANTE; e (iii) demais hipóteses de caso fortuito ou força maior. Nesses casos, havendo pagamento antecipado, será restituído ao CONTRATANTE o valor proporcional das sessões não usufruídas, sem qualquer penalidade.
3.7 – Da suspensão (congelamento) do plano: o CONTRATANTE poderá solicitar a suspensão temporária do plano por período de até 30 (trinta) dias, mediante comprovação de motivo justificado (tais como lesão, gestação ou viagem), ficando a vigência do contrato automaticamente prorrogada pelo mesmo período da suspensão, a fim de preservar a realização integral das sessões contratadas.

CLÁUSULA QUARTA – DAS DISPOSIÇÕES GERAIS
4.1 – O CONTRATANTE terá a opção de escolha do horário das sessões conforme disponibilidade, respeitando o limite de até 3 (três) alunos por horário nas sessões de Pilates. Os atendimentos de Fisioterapia Pélvica são individuais e seguem a agenda da profissional responsável.
4.2 – O CONTRATANTE tem o direito de reagendar até 25% (vinte e cinco por cento) das sessões contratadas, observado o prazo mínimo de 3 (três) horas de antecedência para o aviso da impossibilidade de comparecimento no horário preestabelecido.
4.3 – Se, decorridos 10 (dez) minutos do horário agendado, o CONTRATANTE não comparecer à sessão e não avisar previamente conforme estabelecido no item anterior, não terá direito à reposição da sessão.
4.4 – A CONTRATADA não funcionará em feriados oficiais. As sessões que coincidirem com feriados serão repostas em outro horário disponível, dentro da vigência do contrato, sem custo adicional ao CONTRATANTE, de modo a preservar a integralidade das sessões contratadas.
4.5 – Poderá o CONTRATANTE reagendar sessão em caso de falecimento de parente até o 3º (terceiro) grau, sem utilizar o direito disposto no item 4.2.
4.6 – Quando o CONTRATANTE não comparecer a uma sessão de reposição, este não terá direito a nova reposição.
4.7 – Todas as hipóteses de reposição de sessões só poderão ser realizadas durante a vigência do contrato.
4.8 – O presente contrato é firmado em caráter individual e intransferível na pessoa do CONTRATANTE.
4.9 – A CONTRATADA poderá efetuar as alterações que se fizerem necessárias nos horários dos profissionais ou das sessões, desde que comunique o CONTRATANTE com antecedência mínima de 3 (três) horas.
4.10 – O CONTRATANTE deverá zelar e utilizar adequadamente os equipamentos e bens móveis da CONTRATADA. Caso a má utilização venha a causar danos, ficará o CONTRATANTE obrigado a repará-los.
4.11 – A tolerância, por qualquer das partes, com relação ao descumprimento de qualquer termo ou condição aqui ajustado não será considerada como desistência em exigir o cumprimento da disposição, nem representará novação com relação à obrigação passada, presente ou futura.

CLÁUSULA QUINTA – DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)
5.1 – As partes se comprometem a tratar os dados pessoais coletados em razão deste contrato em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados – LGPD).
5.2 – O CONTRATANTE autoriza a CONTRATADA a coletar e tratar seus dados pessoais e dados pessoais sensíveis referentes à saúde, quando aplicável, exclusivamente para as finalidades de execução do presente contrato, prestação adequada e segura do serviço, cumprimento de obrigações legais e regulatórias e exercício regular de direitos.
5.3 – A CONTRATADA compromete-se a não compartilhar os dados do CONTRATANTE com terceiros, salvo quando necessário à execução do contrato, por determinação legal ou por ordem de autoridade competente, adotando medidas técnicas e administrativas para proteção dos dados.
5.4 – É assegurado ao CONTRATANTE, na qualidade de titular, o exercício dos direitos previstos no art. 18 da LGPD, incluindo confirmação, acesso, correção e eliminação de dados. As solicitações e comunicações poderão ser dirigidas ao encarregado pelo tratamento de dados, pelo e-mail: {{clinica_email}}.
5.5 – Os dados serão mantidos pelo prazo necessário ao cumprimento das finalidades acima e dos prazos legais aplicáveis, sendo posteriormente eliminados ou anonimizados.

CLÁUSULA SEXTA – DO FORO DE ELEIÇÃO
6.1 – Para dirimir qualquer litígio decorrente do presente contrato, fica eleito o Foro da Comarca de Xanxerê, Estado de Santa Catarina, ressalvado, nas relações de consumo, o direito do CONTRATANTE de optar pelo foro de seu domicílio, nos termos da legislação vigente.

Por estarem assim justas e contratadas, as partes assinam o presente contrato, que reconhecem como válido e vinculante, valendo o presente como título executivo extrajudicial, nos termos do art. 784 do Código de Processo Civil.

Xanxerê, {{data}}.

CONTRATADA

______________________________________
Corporis Fisioterapia e Pilates Ltda
Larissa Pacheco Ferraz – Administradora

CONTRATANTE

______________________________________
{{cliente}}
CPF {{cpf}}$corpo$, '["pilates", "fisio_pelvica"]'::jsonb, '[]'::jsonb, true
where not exists (select 1 from vendas.contrato_modelo where nome = 'Pacote misto — Pilates + Fisioterapia Pélvica');

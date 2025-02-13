import { axiosPrivate } from "~/config/axios";
import { Rule } from "~/db/schemas/rules";

type RulePayload = {
  name: string;
  description?: string;
} & Pick<Rule, "category">;

class RuleService {
  static createRule = async (data: RulePayload) => {
    const { data: response } = await axiosPrivate.post<Rule>(`/api/admin/rules`, data);

    return response;
  };

  static getRules = async () => {
    const { data: response } = await axiosPrivate.get<Rule[]>(`/api/admin/rules`);

    return response;
  };

  static deleteRule = async (id: string) => {
    const { data: response } = await axiosPrivate.delete(`/api/admin/rules/${id}`);

    return response;
  };

  static updateRule = async ({ id, data }: { id: string; data: Partial<RulePayload> }) => {
    const { data: response } = await axiosPrivate.patch<Rule>(`/api/admin/rules/${id}`, data);

    return response;
  };
}

export default RuleService;

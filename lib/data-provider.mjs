export async function purchaseDataByPlan(plan, params, providers) {
  try {
    const provider = providers?.[plan.apiSource];

    if (!provider) {
      return {
        success: false,
        message: `Unsupported data provider: ${plan.apiSource}`,
      };
    }

    if (plan.apiSource === "API_A") {
      return await provider({
        externalNetworkId: plan.externalNetworkId,
        externalPlanId: plan.externalPlanId,
        phone: params.phone,
        reference: params.reference,
      });
    }

    if (plan.apiSource === "API_B") {
      return await provider({
        plan: plan.externalPlanId,
        mobileNumber: params.phone,
        network: plan.network,
        reference: params.reference,
      });
    }

    if (plan.apiSource === "API_C") {
      return await provider({
        network: plan.externalNetworkId,
        plan: plan.externalPlanId,
        phone: params.phone,
        reference: params.reference,
      });
    }

    if (plan.apiSource === "API_D") {
      return await provider({
        plan: plan.externalPlanId,
        network: plan.externalNetworkId,
        phone: params.phone,
        reference: params.reference,
      });
    }

    if (plan.apiSource === "API_E") {
      return await provider({
        plan: plan.externalPlanId,
        network: plan.externalNetworkId,
        phone: params.phone,
        reference: params.reference,
      });
    }

    return {
      success: false,
      message: `Unsupported data provider: ${plan.apiSource}`,
    };
  } catch (error) {
    return {
      success: false,
      message: error?.message || "Data provider dispatch error",
    };
  }
}

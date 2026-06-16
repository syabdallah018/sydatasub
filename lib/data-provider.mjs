export async function purchaseDataByPlan(plan, params, providers) {
  const provider = providers?.[plan.apiSource];

  if (!provider) {
    return {
      success: false,
      message: `Unsupported data provider: ${plan.apiSource}`,
    };
  }

  if (plan.apiSource === "API_A") {
    return provider({
      externalNetworkId: plan.externalNetworkId,
      externalPlanId: plan.externalPlanId,
      phone: params.phone,
      reference: params.reference,
    });
  }

  if (plan.apiSource === "API_B") {
    return provider({
      plan: plan.externalPlanId,
      mobileNumber: params.phone,
      network: plan.network,
      reference: params.reference,
    });
  }

  if (plan.apiSource === "API_C") {
    return provider({
      network: plan.externalNetworkId,
      plan: plan.externalPlanId,
      phone: params.phone,
      reference: params.reference,
    });
  }

  if (plan.apiSource === "API_D") {
    return provider({
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
}

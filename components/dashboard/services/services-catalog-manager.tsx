'use client';

import React, { useState, useMemo } from 'react';
import {
  type CategoryItem,
  type ServiceItem,
} from '@/actions/service';
import { ServiceDataTable, type PlanQuotaInfo } from './service-data-table';

export interface ServicesCatalogManagerProps {
  initialCategories: CategoryItem[];
  initialServices: ServiceItem[];
  initialCategoryId?: string | null;
  currencySymbol?: string;
  planQuota: PlanQuotaInfo;
}

export function ServicesCatalogManager({
  initialCategories,
  initialServices,
  initialCategoryId = null,
  currencySymbol = '$',
  planQuota,
}: ServicesCatalogManagerProps) {
  const [categories] = useState<CategoryItem[]>(initialCategories);
  const [services, setServices] = useState<ServiceItem[]>(initialServices);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(initialCategoryId);

  // Compute live service counts for each category
  const categoriesWithCounts = useMemo(() => {
    const countMap = new Map<string, number>();
    for (const srv of services) {
      countMap.set(srv.categoryId, (countMap.get(srv.categoryId) || 0) + 1);
    }
    return categories.map((cat) => ({
      ...cat,
      serviceCount: countMap.get(cat.id) || 0,
    }));
  }, [categories, services]);

  const handleServicesChange = (updatedServices: ServiceItem[]) => {
    setServices(updatedServices);
  };

  return (
    <div className="w-full">
      <ServiceDataTable
        services={services}
        categories={categoriesWithCounts}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
        currencySymbol={currencySymbol}
        planQuota={planQuota}
        onServicesChange={handleServicesChange}
      />
    </div>
  );
}

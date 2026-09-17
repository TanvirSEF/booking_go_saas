'use client';

import React, { useState, useMemo } from 'react';
import {
  type CategoryItem,
  type ServiceItem,
} from '@/actions/service';
import { CategoryList } from './category-list';
import { ServiceDataTable, type PlanQuotaInfo } from './service-data-table';

export interface ServicesManagerProps {
  initialCategories: CategoryItem[];
  initialServices: ServiceItem[];
  currencySymbol?: string;
  planQuota: PlanQuotaInfo;
}

export function ServicesManager({
  initialCategories,
  initialServices,
  currencySymbol = '$',
  planQuota,
}: ServicesManagerProps) {
  const [categories, setCategories] = useState<CategoryItem[]>(initialCategories);
  const [services, setServices] = useState<ServiceItem[]>(initialServices);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

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

  const handleCategoriesChange = (updatedCategories: CategoryItem[]) => {
    setCategories(updatedCategories);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
      {/* Left Sidebar: Categories Navigation & Management */}
      <div className="lg:col-span-1">
        <CategoryList
          categories={categoriesWithCounts}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
          onCategoriesChange={handleCategoriesChange}
          totalServicesCount={services.length}
        />
      </div>

      {/* Right Column: Filterable Services Data Table */}
      <div className="lg:col-span-3">
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
    </div>
  );
}
